/**
 * Cloudflare Worker API for Bycme.
 */

export interface Env {
  DB: D1Database;
}

const AUTH_SECRET = "bycme-auth-secret-key-2026-sha256";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const saltBytes = hexToBytes(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const derivedHex = bytesToHex(new Uint8Array(derivedBits));
  return derivedHex === expectedHashHex;
}

async function createSessionToken(userId: string): Promise<string> {
  const payload = `${userId}:${Date.now()}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigHex = bytesToHex(new Uint8Array(sig));
  return btoa(`${payload}:${sigHex}`);
}

async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const decoded = atob(token);
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [userId, timestamp, sigHex] = parts;
    const payload = `${userId}:${timestamp}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = hexToBytes(sigHex);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
    return valid ? userId : null;
  } catch {
    return null;
  }
}

async function getPersonWithRoles(
  db: D1Database,
  userId: string
): Promise<{ id: string; email: string; name: string; roles: string[]; createdAt: string } | null> {
  const person = await db
    .prepare("SELECT id, email, name, created_at FROM persons WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string; name: string; created_at: string }>();

  if (!person) return null;

  const roleRows = await db
    .prepare("SELECT role FROM person_roles WHERE person_id = ? ORDER BY role")
    .bind(userId)
    .all<{ role: string }>();

  return {
    id: person.id,
    email: person.email,
    name: person.name,
    roles: (roleRows.results || []).map((r) => r.role),
    createdAt: person.created_at,
  };
}

async function authenticateRequest(
  request: Request,
  env: Env
): Promise<{ id: string; email: string; name: string; roles: string[]; createdAt: string } | null> {
  const authHeader = request.headers.get("Authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return null;
  const userId = await verifySessionToken(tokenMatch[1]);
  if (!userId) return null;
  return getPersonWithRoles(env.DB, userId);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Health check endpoint
      if (pathname === "/api/health" && request.method === "GET") {
        return jsonResponse({
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: "staging",
        });
      }

      // User login endpoint
      if (pathname === "/api/auth/login" && request.method === "POST") {
        const body = (await request.json()) as { email?: string; password?: string };
        if (!body.email || !body.password) {
          return jsonResponse({ error: "Email and password required" }, 400);
        }

        const userRow = await env.DB.prepare(
          "SELECT id, email, name, password_hash, password_salt, created_at FROM persons WHERE LOWER(email) = LOWER(?)"
        )
          .bind(body.email.trim())
          .first<{
            id: string;
            email: string;
            name: string;
            password_hash: string;
            password_salt: string;
            created_at: string;
          }>();

        if (!userRow) {
          return jsonResponse({ error: "Invalid email or password" }, 401);
        }

        const valid = await verifyPassword(
          body.password,
          userRow.password_salt,
          userRow.password_hash
        );
        if (!valid) {
          return jsonResponse({ error: "Invalid email or password" }, 401);
        }

        const person = await getPersonWithRoles(env.DB, userRow.id);
        if (!person) {
          return jsonResponse({ error: "User profile missing" }, 500);
        }

        const token = await createSessionToken(userRow.id);
        return jsonResponse({ token, user: person });
      }

      // Current authenticated user
      if (pathname === "/api/auth/me" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        return jsonResponse(caller);
      }

      // List all persons (Admin only)
      if (pathname === "/api/persons" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const personsResult = await env.DB.prepare(
          "SELECT id, email, name, created_at as createdAt FROM persons ORDER BY name"
        ).all<{ id: string; email: string; name: string; createdAt: string }>();

        const rolesResult = await env.DB.prepare(
          "SELECT person_id as personId, role FROM person_roles"
        ).all<{ personId: string; role: string }>();

        const rolesByPerson: Record<string, string[]> = {};
        for (const row of rolesResult.results || []) {
          if (!rolesByPerson[row.personId]) {
            rolesByPerson[row.personId] = [];
          }
          rolesByPerson[row.personId].push(row.role);
        }

        const persons = (personsResult.results || []).map((p) => ({
          id: p.id,
          email: p.email,
          name: p.name,
          roles: rolesByPerson[p.id] || [],
          createdAt: p.createdAt,
        }));

        return jsonResponse(persons);
      }

      // Cities endpoints
      if (pathname === "/api/cities" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const res = await env.DB.prepare(
          "SELECT id, name, state, created_at as createdAt FROM cities ORDER BY name"
        ).all();
        return jsonResponse(res.results || []);
      }

      if (pathname === "/api/cities" && request.method === "POST") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const body = (await request.json()) as { name?: string; state?: string };
        if (!body.name?.trim() || !body.state?.trim()) {
          return jsonResponse({ error: "Name and state are required" }, 400);
        }

        const id = `city-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT INTO cities (id, name, state) VALUES (?, ?, ?)"
        )
          .bind(id, body.name.trim(), body.state.trim())
          .run();

        const created = await env.DB.prepare(
          "SELECT id, name, state, created_at as createdAt FROM cities WHERE id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(created, 201);
      }

      if (pathname.startsWith("/api/cities/") && request.method === "PUT") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const id = decodeURIComponent(pathname.replace("/api/cities/", ""));
        const body = (await request.json()) as { name?: string; state?: string };

        const existing = await env.DB.prepare("SELECT * FROM cities WHERE id = ?")
          .bind(id)
          .first<{ id: string; name: string; state: string }>();
        if (!existing) {
          return jsonResponse({ error: "City not found" }, 404);
        }

        const newName = body.name !== undefined ? body.name.trim() : existing.name;
        const newState = body.state !== undefined ? body.state.trim() : existing.state;

        await env.DB.prepare(
          "UPDATE cities SET name = ?, state = ? WHERE id = ?"
        )
          .bind(newName, newState, id)
          .run();

        const updated = await env.DB.prepare(
          "SELECT id, name, state, created_at as createdAt FROM cities WHERE id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(updated);
      }

      // Buildings endpoints
      if (pathname === "/api/buildings" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const cityId = url.searchParams.get("cityId");
        let query =
          "SELECT b.id, b.city_id as cityId, b.name, b.building_type as buildingType, b.created_at as createdAt, c.name as cityName " +
          "FROM buildings b LEFT JOIN cities c ON b.city_id = c.id";
        let res;
        if (cityId) {
          query += " WHERE b.city_id = ? ORDER BY b.name";
          res = await env.DB.prepare(query).bind(cityId).all();
        } else {
          query += " ORDER BY b.name";
          res = await env.DB.prepare(query).all();
        }
        return jsonResponse(res.results || []);
      }

      if (pathname === "/api/buildings" && request.method === "POST") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const body = (await request.json()) as {
          cityId?: string;
          name?: string;
          buildingType?: string;
        };
        if (!body.cityId || !body.name?.trim() || !body.buildingType) {
          return jsonResponse({ error: "cityId, name, and buildingType are required" }, 400);
        }

        const id = `bld-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT INTO buildings (id, city_id, name, building_type) VALUES (?, ?, ?, ?)"
        )
          .bind(id, body.cityId, body.name.trim(), body.buildingType)
          .run();

        const created = await env.DB.prepare(
          "SELECT b.id, b.city_id as cityId, b.name, b.building_type as buildingType, b.created_at as createdAt, c.name as cityName " +
          "FROM buildings b LEFT JOIN cities c ON b.city_id = c.id WHERE b.id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(created, 201);
      }

      if (pathname.startsWith("/api/buildings/") && request.method === "PUT") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const id = decodeURIComponent(pathname.replace("/api/buildings/", ""));
        const body = (await request.json()) as {
          cityId?: string;
          name?: string;
          buildingType?: string;
        };

        const existing = await env.DB.prepare("SELECT * FROM buildings WHERE id = ?")
          .bind(id)
          .first<{ id: string; city_id: string; name: string; building_type: string }>();
        if (!existing) {
          return jsonResponse({ error: "Building not found" }, 404);
        }

        const newName = body.name !== undefined ? body.name.trim() : existing.name;
        const newCityId = body.cityId !== undefined ? body.cityId : existing.city_id;
        const newType = body.buildingType !== undefined ? body.buildingType : existing.building_type;

        await env.DB.prepare(
          "UPDATE buildings SET name = ?, city_id = ?, building_type = ? WHERE id = ?"
        )
          .bind(newName, newCityId, newType, id)
          .run();

        const updated = await env.DB.prepare(
          "SELECT b.id, b.city_id as cityId, b.name, b.building_type as buildingType, b.created_at as createdAt, c.name as cityName " +
          "FROM buildings b LEFT JOIN cities c ON b.city_id = c.id WHERE b.id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(updated);
      }

      // Parkings endpoints
      if (pathname === "/api/parkings" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const buildingId = url.searchParams.get("buildingId");
        let query =
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, b.name as buildingName, c.name as cityName " +
          "FROM parkings p LEFT JOIN buildings b ON p.building_id = b.id LEFT JOIN cities c ON b.city_id = c.id";
        let res;
        if (buildingId) {
          query += " WHERE p.building_id = ? ORDER BY p.name";
          res = await env.DB.prepare(query).bind(buildingId).all();
        } else {
          query += " ORDER BY p.name";
          res = await env.DB.prepare(query).all();
        }
        return jsonResponse(res.results || []);
      }

      if (pathname === "/api/parkings" && request.method === "POST") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const body = (await request.json()) as {
          buildingId?: string;
          name?: string;
          capacity?: number;
        };
        if (!body.buildingId || !body.name?.trim()) {
          return jsonResponse({ error: "buildingId and name are required" }, 400);
        }

        const id = `prk-${crypto.randomUUID().slice(0, 8)}`;
        const capacity = typeof body.capacity === "number" ? body.capacity : 10;
        await env.DB.prepare(
          "INSERT INTO parkings (id, building_id, name, capacity) VALUES (?, ?, ?, ?)"
        )
          .bind(id, body.buildingId, body.name.trim(), capacity)
          .run();

        const created = await env.DB.prepare(
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, b.name as buildingName, c.name as cityName " +
          "FROM parkings p LEFT JOIN buildings b ON p.building_id = b.id LEFT JOIN cities c ON b.city_id = c.id WHERE p.id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(created, 201);
      }

      if (pathname.startsWith("/api/parkings/") && request.method === "PUT") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const id = decodeURIComponent(pathname.replace("/api/parkings/", ""));
        const body = (await request.json()) as {
          buildingId?: string;
          name?: string;
          capacity?: number;
        };

        const existing = await env.DB.prepare("SELECT * FROM parkings WHERE id = ?")
          .bind(id)
          .first<{ id: string; building_id: string; name: string; capacity: number }>();
        if (!existing) {
          return jsonResponse({ error: "Parking not found" }, 404);
        }

        const newName = body.name !== undefined ? body.name.trim() : existing.name;
        const newBuildingId = body.buildingId !== undefined ? body.buildingId : existing.building_id;
        const newCapacity = typeof body.capacity === "number" ? body.capacity : existing.capacity;

        await env.DB.prepare(
          "UPDATE parkings SET name = ?, building_id = ?, capacity = ? WHERE id = ?"
        )
          .bind(newName, newBuildingId, newCapacity, id)
          .run();

        const updated = await env.DB.prepare(
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, b.name as buildingName, c.name as cityName " +
          "FROM parkings p LEFT JOIN buildings b ON p.building_id = b.id LEFT JOIN cities c ON b.city_id = c.id WHERE p.id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(updated);
      }

      return jsonResponse({ error: "Not Found" }, 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      return jsonResponse({ error: message }, 500);
    }
  },
};
