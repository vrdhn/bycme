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

function generateCompactToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function formatManagerInvitation(
  row: {
    id: string;
    token: string;
    parking_id: string;
    role: string;
    created_by: string;
    status: string;
    is_preapproved?: number;
    expires_at: string;
    created_at: string;
    parking_name?: string;
    city_name?: string;
    created_by_name?: string;
  },
  frontendBase: string = "https://bycme-staging.pages.dev",
  explicitHours?: number
) {
  const isPreapproved = Boolean(row.is_preapproved);
  const routePrefix = row.role === "Rider" ? "join/rider" : "join/mgr";
  const inviteUrl = `${frontendBase}/#/${routePrefix}/${row.token}`;
  const hours =
    explicitHours ||
    Math.max(
      1,
      Math.round((new Date(row.expires_at).getTime() - Date.now()) / (3600 * 1000))
    );
  const parkingInfo = row.parking_name
    ? `${row.parking_name}${row.city_name ? ` (${row.city_name})` : ""}`
    : "this parking lot";
  const inviter = row.created_by_name || (row.role === "Rider" ? "Parking Manager" : "System Admin");

  const accessNote = isPreapproved
    ? `Note: This is a direct pre-approved invitation (single-use) valid for ${hours} hours.`
    : `Note: This link is valid for ${hours} hours. Submissions require approval.`;

  const actionText = row.role === "Rider" ? "ride bicycles at" : "manage";
  const whatsappMessage =
    `${inviter} is inviting you to ${actionText} ${parkingInfo}.\n` +
    `Click here to register and get started:\n` +
    `${inviteUrl}\n\n` +
    accessNote;

  return {
    id: row.id,
    token: row.token,
    parkingId: row.parking_id,
    role: row.role,
    createdBy: row.created_by,
    status: row.status,
    isPreapproved,
    expiresAt: row.expires_at,
    inviteUrl,
    whatsappMessage,
    parkingName: row.parking_name,
    cityName: row.city_name,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

function formatCycle(
  row: {
    id: string;
    public_cycle_id: string;
    parking_id: string;
    company: string;
    model: string;
    colour: string;
    status: string;
    lock_code?: string;
    qr_code: string;
    created_at: string;
    updated_at: string;
    parking_name?: string;
    city_name?: string;
  },
  frontendBase: string = "https://bycme-staging.pages.dev",
  includeLockCode: boolean = true,
  isAvailable?: boolean,
  isCheckedOutByMe?: boolean
) {
  return {
    id: row.id,
    publicCycleId: row.public_cycle_id,
    parkingId: row.parking_id,
    brand: row.company,
    cycleModel: row.model,
    colour: row.colour,
    status: row.status,
    lockCode: includeLockCode ? row.lock_code : undefined,
    qrCode: row.qr_code,
    qrUrl: `${frontendBase}/#/cycle/${row.qr_code}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parkingName: row.parking_name,
    cityName: row.city_name,
    isAvailable: isAvailable ?? (row.status === "Working"),
    isCheckedOutByMe: isCheckedOutByMe ?? false,
  };
}

function formatCycleCheckout(row: {
  id: string;
  cycle_id: string;
  person_id: string;
  parking_id: string;
  checked_out_at: string;
  returned_at?: string | null;
  status: string;
  public_cycle_id?: string;
  company?: string;
  model?: string;
  colour?: string;
  lock_code?: string;
  parking_name?: string;
  city_name?: string;
  return_condition?: string | null;
  return_notes?: string | null;
}) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    personId: row.person_id,
    parkingId: row.parking_id,
    checkedOutAt: row.checked_out_at,
    returnedAt: row.returned_at || undefined,
    status: row.status,
    publicCycleId: row.public_cycle_id,
    brand: row.company,
    cycleModel: row.model,
    colour: row.colour,
    lockCode: row.lock_code,
    parkingName: row.parking_name,
    cityName: row.city_name,
    returnCondition: row.return_condition || undefined,
    returnNotes: row.return_notes || undefined,
  };
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

async function hashPassword(
  password: string
): Promise<{ saltHex: string; hashHex: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const saltHex = bytesToHex(salt);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  return { saltHex, hashHex };
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

      // User register endpoint
      if (pathname === "/api/auth/register" && request.method === "POST") {
        const body = (await request.json()) as {
          name?: string;
          email?: string;
          password?: string;
        };
        if (!body.name || !body.email || !body.password) {
          return jsonResponse({ error: "Name, email, and password required" }, 400);
        }
        if (body.password.length < 6) {
          return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
        }

        const existing = await env.DB.prepare(
          "SELECT id FROM persons WHERE LOWER(email) = LOWER(?)"
        )
          .bind(body.email.trim())
          .first<{ id: string }>();

        if (existing) {
          return jsonResponse({ error: "An account with this email already exists" }, 400);
        }

        const { saltHex, hashHex } = await hashPassword(body.password);
        const personId = `usr-${crypto.randomUUID().slice(0, 8)}`;
        const trimmedEmail = body.email.trim();
        const trimmedName = body.name.trim();

        await env.DB.prepare(
          "INSERT INTO persons (id, email, name, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(personId, trimmedEmail, trimmedName, hashHex, saltHex)
          .run();

        const person = await getPersonWithRoles(env.DB, personId);
        if (!person) {
          return jsonResponse({ error: "User registration failed" }, 500);
        }

        const token = await createSessionToken(personId);
        return jsonResponse({ token, user: person }, 201);
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
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, b.name as buildingName, c.name as cityName, b.building_type as buildingType " +
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
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, b.name as buildingName, c.name as cityName, b.building_type as buildingType " +
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
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, b.name as buildingName, c.name as cityName, b.building_type as buildingType " +
          "FROM parkings p LEFT JOIN buildings b ON p.building_id = b.id LEFT JOIN cities c ON b.city_id = c.id WHERE p.id = ?"
        )
          .bind(id)
          .first();

        return jsonResponse(updated);
      }

      // Parking Manager Invitations
      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.endsWith("/manager-invitations") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/parkings/", "").replace("/manager-invitations", "")
        );
        const body = ((await request.json().catch(() => ({}))) || {}) as {
          durationHours?: number;
          isPreapproved?: boolean;
        };

        const parking = await env.DB.prepare(
          "SELECT p.id, p.name as parking_name, c.name as city_name, b.building_type " +
            "FROM parkings p LEFT JOIN buildings b ON p.building_id = b.id LEFT JOIN cities c ON b.city_id = c.id " +
            "WHERE p.id = ?"
        )
          .bind(parkingId)
          .first<{ id: string; parking_name: string; city_name: string; building_type: string }>();

        if (!parking) {
          return jsonResponse({ error: "Parking not found" }, 404);
        }

        if (parking.building_type !== "Private") {
          return jsonResponse(
            { error: "Manager invitations are only permitted for private (residential) parkings. Public parkings cannot have managers." },
            400
          );
        }

        const durationHours =
          typeof body.durationHours === "number" && body.durationHours > 0
            ? body.durationHours
            : 24;
        const isPreapproved = body.isPreapproved ? 1 : 0;
        const id = `inv-${crypto.randomUUID().slice(0, 8)}`;
        const token = generateCompactToken();
        const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

        await env.DB.prepare(
          "INSERT INTO invitations (id, token, parking_id, role, created_by, status, is_preapproved, expires_at) " +
            "VALUES (?, ?, ?, 'Manager', ?, 'active', ?, ?)"
        )
          .bind(id, token, parkingId, caller.id, isPreapproved, expiresAt)
          .run();

        const invRow = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
            "p.name as parking_name, c.name as city_name, u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.id = ?"
        )
          .bind(id)
          .first<any>();

        return jsonResponse(
          formatManagerInvitation(invRow, "https://bycme-staging.pages.dev", durationHours),
          201
        );
      }

      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.endsWith("/manager-invitations") &&
        request.method === "GET"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/parkings/", "").replace("/manager-invitations", "")
        );

        const res = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
            "p.name as parking_name, c.name as city_name, u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.parking_id = ? AND i.role = 'Manager' AND i.status = 'active' AND datetime(i.expires_at) > datetime('now') " +
            "ORDER BY i.created_at DESC"
        )
          .bind(parkingId)
          .all<any>();

        const formatted = (res.results || []).map((row) =>
          formatManagerInvitation(row, "https://bycme-staging.pages.dev")
        );
        return jsonResponse(formatted);
      }

      // Parking Rider Invitations (Manager only)
      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.endsWith("/rider-invitations") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/parkings/", "").replace("/rider-invitations", "")
        );

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        const body = ((await request.json().catch(() => ({}))) || {}) as {
          durationHours?: number;
          isPreapproved?: boolean;
        };

        const parking = await env.DB.prepare(
          "SELECT p.id, p.name as parking_name, c.name as city_name, b.building_type " +
            "FROM parkings p LEFT JOIN buildings b ON p.building_id = b.id LEFT JOIN cities c ON b.city_id = c.id " +
            "WHERE p.id = ?"
        )
          .bind(parkingId)
          .first<{ id: string; parking_name: string; city_name: string; building_type: string }>();

        if (!parking) {
          return jsonResponse({ error: "Parking not found" }, 404);
        }

        if (parking.building_type !== "Private") {
          return jsonResponse(
            { error: "Rider invitations can only be created for private residential parkings" },
            400
          );
        }

        const durationHours =
          typeof body.durationHours === "number" && body.durationHours > 0
            ? body.durationHours
            : 24;
        const isPreapproved = body.isPreapproved ? 1 : 0;
        const id = `inv-rdr-${crypto.randomUUID().slice(0, 8)}`;
        const token = generateCompactToken();
        const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

        await env.DB.prepare(
          "INSERT INTO invitations (id, token, parking_id, role, created_by, status, is_preapproved, expires_at) " +
            "VALUES (?, ?, ?, 'Rider', ?, 'active', ?, ?)"
        )
          .bind(id, token, parkingId, caller.id, isPreapproved, expiresAt)
          .run();

        const invRow = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
            "p.name as parking_name, c.name as city_name, u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.id = ?"
        )
          .bind(id)
          .first<any>();

        return jsonResponse(
          formatManagerInvitation(invRow, "https://bycme-staging.pages.dev", durationHours),
          201
        );
      }

      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.endsWith("/rider-invitations") &&
        request.method === "GET"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/parkings/", "").replace("/rider-invitations", "")
        );

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        const res = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
            "p.name as parking_name, c.name as city_name, u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.parking_id = ? AND i.role = 'Rider' AND i.status = 'active' AND datetime(i.expires_at) > datetime('now') " +
            "ORDER BY i.created_at DESC"
        )
          .bind(parkingId)
          .all<any>();

        const formatted = (res.results || []).map((row) =>
          formatManagerInvitation(row, "https://bycme-staging.pages.dev")
        );
        return jsonResponse(formatted);
      }

      // Manager revoke rider invitation
      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.includes("/rider-invitations/") &&
        pathname.endsWith("/revoke") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parts = pathname
          .replace("/api/parkings/", "")
          .replace("/revoke", "")
          .split("/rider-invitations/");
        const parkingId = decodeURIComponent(parts[0]);
        const invId = decodeURIComponent(parts[1]);

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        await env.DB.prepare(
          "UPDATE invitations SET status = 'revoked' WHERE id = ? AND parking_id = ? AND role = 'Rider'"
        )
          .bind(invId, parkingId)
          .run();

        const invRow = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
            "p.name as parking_name, c.name as city_name, u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.id = ?"
        )
          .bind(invId)
          .first<any>();

        return jsonResponse(formatManagerInvitation(invRow, "https://bycme-staging.pages.dev"));
      }

      // Public invitation details lookup
      if (
        pathname.startsWith("/api/invitations/") &&
        !pathname.endsWith("/respond") &&
        request.method === "GET"
      ) {
        const token = decodeURIComponent(pathname.replace("/api/invitations/", ""));
        const row = await env.DB.prepare(
          "SELECT i.token, i.role, i.is_preapproved, i.expires_at, i.status, " +
            "p.id as parking_id, p.name as parking_name, " +
            "b.name as building_name, c.name as city_name, " +
            "u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.token = ? AND i.status = 'active' AND datetime(i.expires_at) > datetime('now')"
        )
          .bind(token)
          .first<any>();

        if (!row) {
          return jsonResponse({ error: "Invitation not found or has expired" }, 404);
        }

        const caller = await authenticateRequest(request, env);
        let currentParkingId: string | undefined;
        let currentParkingName: string | undefined;
        let currentCityName: string | undefined;

        if (caller) {
          const currentRider = await env.DB.prepare(
            "SELECT pr.parking_id, p.name as parking_name, c.name as city_name " +
              "FROM parking_riders pr " +
              "JOIN parkings p ON pr.parking_id = p.id " +
              "JOIN buildings b ON p.building_id = b.id " +
              "JOIN cities c ON b.city_id = c.id " +
              "WHERE pr.person_id = ?"
          )
            .bind(caller.id)
            .first<{ parking_id: string; parking_name: string; city_name: string }>();

          if (currentRider) {
            currentParkingId = currentRider.parking_id;
            currentParkingName = currentRider.parking_name;
            currentCityName = currentRider.city_name;
          }
        }

        return jsonResponse({
          token: row.token,
          role: row.role,
          isPreapproved: Boolean(row.is_preapproved),
          parkingId: row.parking_id,
          parkingName: row.parking_name,
          buildingName: row.building_name,
          cityName: row.city_name,
          createdByName: row.created_by_name,
          expiresAt: row.expires_at,
          currentParkingId,
          currentParkingName,
          currentCityName,
        });
      }

      // Respond to invitation
      if (
        pathname.startsWith("/api/invitations/") &&
        pathname.endsWith("/respond") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const token = decodeURIComponent(
          pathname.replace("/api/invitations/", "").replace("/respond", "")
        );

        const inv = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, " +
            "p.name as parking_name, c.name as city_name, b.building_type " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "WHERE i.token = ? AND i.status = 'active' AND datetime(i.expires_at) > datetime('now')"
        )
          .bind(token)
          .first<any>();

        if (!inv) {
          return jsonResponse({ error: "Invitation not found or has expired" }, 404);
        }

        if (inv.building_type !== "Private") {
          return jsonResponse(
            { error: "Invitations are only permitted for private residential parkings." },
            400
          );
        }

        const body = ((await request.json().catch(() => ({}))) || {}) as {
          confirmSwitch?: boolean;
        };

        // RIDER INVITATION HANDLING
        if (inv.role === "Rider") {
          const currentRider = await env.DB.prepare(
            "SELECT pr.parking_id, p.name as parking_name, c.name as city_name " +
              "FROM parking_riders pr " +
              "JOIN parkings p ON pr.parking_id = p.id " +
              "JOIN buildings b ON p.building_id = b.id " +
              "JOIN cities c ON b.city_id = c.id " +
              "WHERE pr.person_id = ?"
          )
            .bind(caller.id)
            .first<{ parking_id: string; parking_name: string; city_name: string }>();

          if (currentRider && currentRider.parking_id === inv.parking_id) {
            return jsonResponse({
              action: "already_exists",
              status: "active",
              message: "You are already a registered rider for this parking stand.",
            });
          }

          if (currentRider && currentRider.parking_id !== inv.parking_id && !body.confirmSwitch) {
            return jsonResponse({
              action: "switch_required",
              status: "switch_pending",
              currentParkingName: currentRider.parking_name,
              currentCityName: currentRider.city_name,
              targetParkingName: inv.parking_name,
              message: `You are currently registered at ${currentRider.parking_name} (${currentRider.city_name}). Switching parking sheds will remove your registration there.`,
            });
          }

          if (inv.is_preapproved) {
            // Remove previous parking assignment if switching sheds
            if (currentRider) {
              await env.DB.prepare("DELETE FROM parking_riders WHERE person_id = ?")
                .bind(caller.id)
                .run();
            }

            const rdrId = `rdr-${crypto.randomUUID().slice(0, 8)}`;
            await env.DB.prepare(
              "INSERT INTO parking_riders (id, parking_id, person_id, assigned_by) VALUES (?, ?, ?, ?)"
            )
              .bind(rdrId, inv.parking_id, caller.id, inv.created_by)
              .run();

            const roleId = `role-${crypto.randomUUID().slice(0, 8)}`;
            await env.DB.prepare(
              "INSERT OR IGNORE INTO person_roles (id, person_id, role) VALUES (?, ?, 'Rider')"
            )
              .bind(roleId, caller.id)
              .run();

            await env.DB.prepare("UPDATE invitations SET status = 'used' WHERE id = ?")
              .bind(inv.id)
              .run();

            return jsonResponse({
              action: currentRider ? "switched" : "joined",
              status: "active",
              message: currentRider
                ? `Successfully switched your parking shed to ${inv.parking_name}!`
                : `Successfully joined ${inv.parking_name} as a rider!`,
            });
          }

          // Standard Rider Application
          const existingReq = await env.DB.prepare(
            "SELECT id, status FROM rider_requests WHERE parking_id = ? AND person_id = ? AND status = 'pending'"
          )
            .bind(inv.parking_id, caller.id)
            .first<any>();

          if (existingReq) {
            return jsonResponse({
              action: "already_requested",
              status: "pending",
              message: "Your application is already pending manager approval for this parking stand",
            });
          }

          const reqId = `rdr-req-${crypto.randomUUID().slice(0, 8)}`;
          const prevParkingId = currentRider ? currentRider.parking_id : null;
          await env.DB.prepare(
            "INSERT INTO rider_requests (id, parking_id, person_id, invitation_id, previous_parking_id, status) " +
              "VALUES (?, ?, ?, ?, ?, 'pending')"
          )
            .bind(reqId, inv.parking_id, caller.id, inv.id, prevParkingId)
            .run();

          return jsonResponse({
            action: "requested",
            status: "pending",
            message: currentRider
              ? `Transfer request to ${inv.parking_name} submitted to manager for approval.`
              : `Application to ${inv.parking_name} submitted to manager for approval.`,
          });
        }

        // MANAGER INVITATION HANDLING
        // Check if caller is already an active manager for this parking
        const existingMgr = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(inv.parking_id, caller.id)
          .first<any>();

        if (existingMgr) {
          return jsonResponse({
            action: "already_exists",
            status: "active",
            message: "You are already an active manager for this parking stand",
          });
        }

        if (inv.is_preapproved) {
          // Pre-Approved 1-time assignment
          const pmId = `pm-${crypto.randomUUID().slice(0, 8)}`;
          await env.DB.prepare(
            "INSERT INTO parking_managers (id, parking_id, person_id, assigned_by) VALUES (?, ?, ?, ?)"
          )
            .bind(pmId, inv.parking_id, caller.id, inv.created_by)
            .run();

          // Ensure Manager role
          const roleId = `role-${crypto.randomUUID().slice(0, 8)}`;
          await env.DB.prepare(
            "INSERT OR IGNORE INTO person_roles (id, person_id, role) VALUES (?, ?, 'Manager')"
          )
            .bind(roleId, caller.id)
            .run();

          // Invalidate single-use invitation
          await env.DB.prepare("UPDATE invitations SET status = 'used' WHERE id = ?")
            .bind(inv.id)
            .run();

          return jsonResponse({
            action: "preapproved_assigned",
            status: "active",
            message: "Pre-approved invitation accepted. You are now a manager of this parking stand.",
            parkingManager: {
              id: pmId,
              parkingId: inv.parking_id,
              personId: caller.id,
              assignedBy: inv.created_by,
              createdAt: new Date().toISOString(),
              parkingName: inv.parking_name,
              cityName: inv.city_name,
              personName: caller.name,
              personEmail: caller.email,
            },
          });
        } else {
          // Check if already has a pending request
          const existingReq = await env.DB.prepare(
            "SELECT id, status, created_at as createdAt FROM manager_requests WHERE parking_id = ? AND person_id = ? AND status = 'pending'"
          )
            .bind(inv.parking_id, caller.id)
            .first<any>();

          if (existingReq) {
            return jsonResponse({
              action: "already_exists",
              status: "pending",
              message: "You already have a pending management request for this parking stand.",
              request: {
                id: existingReq.id,
                parkingId: inv.parking_id,
                personId: caller.id,
                invitationId: inv.id,
                status: "pending",
                createdAt: existingReq.createdAt,
                updatedAt: existingReq.createdAt,
                parkingName: inv.parking_name,
                cityName: inv.city_name,
                personName: caller.name,
                personEmail: caller.email,
              },
            });
          }

          const reqId = `req-${crypto.randomUUID().slice(0, 8)}`;
          const now = new Date().toISOString();
          await env.DB.prepare(
            "INSERT INTO manager_requests (id, parking_id, person_id, invitation_id, status) VALUES (?, ?, ?, ?, 'pending')"
          )
            .bind(reqId, inv.parking_id, caller.id, inv.id)
            .run();

          return jsonResponse(
            {
              action: "request_created",
              status: "pending",
              message: "Request to manage parking submitted successfully. Awaiting Admin approval.",
              request: {
                id: reqId,
                parkingId: inv.parking_id,
                personId: caller.id,
                invitationId: inv.id,
                status: "pending",
                createdAt: now,
                updatedAt: now,
                parkingName: inv.parking_name,
                cityName: inv.city_name,
                personName: caller.name,
                personEmail: caller.email,
              },
            },
            201
          );
        }
      }

      // Caller's own manager requests
      if (pathname === "/api/me/manager-requests" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const res = await env.DB.prepare(
          "SELECT r.id, r.parking_id as parkingId, r.person_id as personId, r.invitation_id as invitationId, " +
            "r.status, r.created_at as createdAt, r.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, " +
            "u.name as personName, u.email as personEmail " +
            "FROM manager_requests r " +
            "LEFT JOIN parkings p ON r.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON r.person_id = u.id " +
            "WHERE r.person_id = ? " +
            "ORDER BY r.created_at DESC"
        )
          .bind(caller.id)
          .all<any>();

        return jsonResponse(res.results || []);
      }

      // Admin list of all manager requests
      if (pathname === "/api/admin/manager-requests" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const res = await env.DB.prepare(
          "SELECT r.id, r.parking_id as parkingId, r.person_id as personId, r.invitation_id as invitationId, " +
            "r.status, r.created_at as createdAt, r.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, " +
            "u.name as personName, u.email as personEmail " +
            "FROM manager_requests r " +
            "LEFT JOIN parkings p ON r.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON r.person_id = u.id " +
            "ORDER BY r.created_at DESC"
        ).all<any>();

        return jsonResponse(res.results || []);
      }

      // Admin approve manager request
      if (
        pathname.startsWith("/api/admin/manager-requests/") &&
        pathname.endsWith("/approve") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const reqId = decodeURIComponent(
          pathname.replace("/api/admin/manager-requests/", "").replace("/approve", "")
        );

        const reqRow = await env.DB.prepare(
          "SELECT r.id, r.parking_id, r.person_id, r.status, p.name as parking_name, c.name as city_name, b.building_type, u.name as person_name, u.email as person_email " +
            "FROM manager_requests r " +
            "LEFT JOIN parkings p ON r.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON r.person_id = u.id " +
            "WHERE r.id = ?"
        )
          .bind(reqId)
          .first<any>();

        if (!reqRow) {
          return jsonResponse({ error: "Manager request not found" }, 404);
        }

        if (reqRow.building_type !== "Private") {
          return jsonResponse(
            { error: "Cannot approve manager request: target parking belongs to a public building." },
            400
          );
        }

        // Update request status
        await env.DB.prepare(
          "UPDATE manager_requests SET status = 'approved', updated_at = datetime('now') WHERE id = ?"
        )
          .bind(reqId)
          .run();

        // Assign to parking_managers
        const pmId = `pm-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT OR IGNORE INTO parking_managers (id, parking_id, person_id, assigned_by) VALUES (?, ?, ?, ?)"
        )
          .bind(pmId, reqRow.parking_id, reqRow.person_id, caller.id)
          .run();

        // Ensure person has Manager role
        const roleId = `role-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT OR IGNORE INTO person_roles (id, person_id, role) VALUES (?, ?, 'Manager')"
        )
          .bind(roleId, reqRow.person_id)
          .run();

        const updated = await env.DB.prepare(
          "SELECT r.id, r.parking_id as parkingId, r.person_id as personId, r.invitation_id as invitationId, " +
            "r.status, r.created_at as createdAt, r.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, " +
            "u.name as personName, u.email as personEmail " +
            "FROM manager_requests r " +
            "LEFT JOIN parkings p ON r.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON r.person_id = u.id " +
            "WHERE r.id = ?"
        )
          .bind(reqId)
          .first<any>();

        return jsonResponse(updated);
      }

      // Admin list all invitations
      if (pathname === "/api/admin/invitations" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const statusParam = url.searchParams.get("status");
        let sql =
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
          "p.name as parking_name, c.name as city_name, b.name as building_name, u.name as created_by_name " +
          "FROM invitations i " +
          "LEFT JOIN parkings p ON i.parking_id = p.id " +
          "LEFT JOIN buildings b ON p.building_id = b.id " +
          "LEFT JOIN cities c ON b.city_id = c.id " +
          "LEFT JOIN persons u ON i.created_by = u.id ";

        if (statusParam === "active") {
          sql += "WHERE i.status = 'active' AND datetime(i.expires_at) > datetime('now') ";
        } else if (statusParam === "used") {
          sql += "WHERE i.status = 'used' ";
        } else if (statusParam === "revoked") {
          sql += "WHERE i.status = 'revoked' ";
        } else if (statusParam === "expired") {
          sql += "WHERE i.status = 'active' AND datetime(i.expires_at) <= datetime('now') ";
        }
        sql += "ORDER BY i.created_at DESC";

        const res = await env.DB.prepare(sql).all<any>();
        const formatted = (res.results || []).map((row) =>
          formatManagerInvitation(row, "https://bycme-staging.pages.dev")
        );
        return jsonResponse(formatted);
      }

      // Admin revoke / expire invitation immediately
      if (
        pathname.startsWith("/api/admin/invitations/") &&
        pathname.endsWith("/revoke") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const invId = decodeURIComponent(
          pathname.replace("/api/admin/invitations/", "").replace("/revoke", "")
        );

        const invRow = await env.DB.prepare("SELECT id FROM invitations WHERE id = ?")
          .bind(invId)
          .first<any>();

        if (!invRow) {
          return jsonResponse({ error: "Invitation not found" }, 404);
        }

        await env.DB.prepare("UPDATE invitations SET status = 'revoked' WHERE id = ?")
          .bind(invId)
          .run();

        const updated = await env.DB.prepare(
          "SELECT i.id, i.token, i.parking_id, i.role, i.created_by, i.status, i.is_preapproved, i.expires_at, i.created_at, " +
            "p.name as parking_name, c.name as city_name, b.name as building_name, u.name as created_by_name " +
            "FROM invitations i " +
            "LEFT JOIN parkings p ON i.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON i.created_by = u.id " +
            "WHERE i.id = ?"
        )
          .bind(invId)
          .first<any>();

        return jsonResponse(formatManagerInvitation(updated, "https://bycme-staging.pages.dev"));
      }

      // Admin reject manager request
      if (
        pathname.startsWith("/api/admin/manager-requests/") &&
        pathname.endsWith("/reject") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Admin")) {
          return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
        }

        const reqId = decodeURIComponent(
          pathname.replace("/api/admin/manager-requests/", "").replace("/reject", "")
        );

        const reqRow = await env.DB.prepare("SELECT id FROM manager_requests WHERE id = ?")
          .bind(reqId)
          .first<any>();

        if (!reqRow) {
          return jsonResponse({ error: "Manager request not found" }, 404);
        }

        await env.DB.prepare(
          "UPDATE manager_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ?"
        )
          .bind(reqId)
          .run();

        const updated = await env.DB.prepare(
          "SELECT r.id, r.parking_id as parkingId, r.person_id as personId, r.invitation_id as invitationId, " +
            "r.status, r.created_at as createdAt, r.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, " +
            "u.name as personName, u.email as personEmail " +
            "FROM manager_requests r " +
            "LEFT JOIN parkings p ON r.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities c ON b.city_id = c.id " +
            "LEFT JOIN persons u ON r.person_id = u.id " +
            "WHERE r.id = ?"
        )
          .bind(reqId)
          .first<any>();

        return jsonResponse(updated);
      }

      // Manager: Get managed parking stands
      if (pathname === "/api/me/parkings" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const sql =
          "SELECT p.id, p.building_id as buildingId, p.name, p.capacity, p.created_at as createdAt, " +
          "b.name as buildingName, c.name as cityName " +
          "FROM parkings p " +
          "INNER JOIN parking_managers pm ON pm.parking_id = p.id " +
          "LEFT JOIN buildings b ON p.building_id = b.id " +
          "LEFT JOIN cities c ON b.city_id = c.id " +
          "WHERE pm.person_id = ? " +
          "ORDER BY p.name";

        const res = await env.DB.prepare(sql).bind(caller.id).all();
        return jsonResponse(res.results || []);
      }

      // Manager: Get rider requests for managed parking
      if (
        pathname.startsWith("/api/me/parkings/") &&
        pathname.endsWith("/rider-requests") &&
        request.method === "GET"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/me/parkings/", "").replace("/rider-requests", "")
        );

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        const res = await env.DB.prepare(
          "SELECT rr.id, rr.parking_id as parkingId, rr.person_id as personId, rr.invitation_id as invitationId, " +
            "rr.previous_parking_id as previousParkingId, rr.status, rr.created_at as createdAt, rr.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, u.name as personName, u.email as personEmail, " +
            "p_prev.name as previousParkingName, c_prev.name as previousCityName " +
            "FROM rider_requests rr " +
            "JOIN parkings p ON rr.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities c ON b.city_id = c.id " +
            "JOIN persons u ON rr.person_id = u.id " +
            "LEFT JOIN parkings p_prev ON rr.previous_parking_id = p_prev.id " +
            "LEFT JOIN buildings b_prev ON p_prev.building_id = b_prev.id " +
            "LEFT JOIN cities c_prev ON b_prev.city_id = c_prev.id " +
            "WHERE rr.parking_id = ? " +
            "ORDER BY rr.created_at DESC"
        )
          .bind(parkingId)
          .all<any>();

        const mapped = (res.results || []).map((r) => ({
          ...r,
          isSwitch: Boolean(r.previousParkingId),
        }));
        return jsonResponse(mapped);
      }

      // Manager: Approve rider request
      if (
        pathname.startsWith("/api/me/parkings/") &&
        pathname.includes("/rider-requests/") &&
        pathname.endsWith("/approve") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parts = pathname.replace("/api/me/parkings/", "").replace("/approve", "").split("/rider-requests/");
        const parkingId = decodeURIComponent(parts[0]);
        const reqId = decodeURIComponent(parts[1]);

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        const reqRow = await env.DB.prepare(
          "SELECT r.id, r.parking_id, r.person_id, r.status, r.previous_parking_id " +
            "FROM rider_requests r WHERE r.id = ? AND r.parking_id = ?"
        )
          .bind(reqId, parkingId)
          .first<any>();

        if (!reqRow) {
          return jsonResponse({ error: "Rider request not found" }, 404);
        }

        // Update request status
        await env.DB.prepare(
          "UPDATE rider_requests SET status = 'approved', updated_at = datetime('now') WHERE id = ?"
        )
          .bind(reqId)
          .run();

        // Enforce single-shed constraint: remove previous assignment if switching
        await env.DB.prepare("DELETE FROM parking_riders WHERE person_id = ?")
          .bind(reqRow.person_id)
          .run();

        // Assign to parking_riders
        const prId = `pr-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT INTO parking_riders (id, parking_id, person_id, assigned_by) VALUES (?, ?, ?, ?)"
        )
          .bind(prId, reqRow.parking_id, reqRow.person_id, caller.id)
          .run();

        // Ensure Rider role
        const roleId = `role-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT OR IGNORE INTO person_roles (id, person_id, role) VALUES (?, ?, 'Rider')"
        )
          .bind(roleId, reqRow.person_id)
          .run();

        const updated = await env.DB.prepare(
          "SELECT rr.id, rr.parking_id as parkingId, rr.person_id as personId, rr.invitation_id as invitationId, " +
            "rr.previous_parking_id as previousParkingId, rr.status, rr.created_at as createdAt, rr.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, u.name as personName, u.email as personEmail " +
            "FROM rider_requests rr " +
            "JOIN parkings p ON rr.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities c ON b.city_id = c.id " +
            "JOIN persons u ON rr.person_id = u.id " +
            "WHERE rr.id = ?"
        )
          .bind(reqId)
          .first<any>();

        return jsonResponse({ ...updated, isSwitch: Boolean(updated.previousParkingId) });
      }

      // Manager: Reject rider request
      if (
        pathname.startsWith("/api/me/parkings/") &&
        pathname.includes("/rider-requests/") &&
        pathname.endsWith("/reject") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parts = pathname.replace("/api/me/parkings/", "").replace("/reject", "").split("/rider-requests/");
        const parkingId = decodeURIComponent(parts[0]);
        const reqId = decodeURIComponent(parts[1]);

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        await env.DB.prepare(
          "UPDATE rider_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ? AND parking_id = ?"
        )
          .bind(reqId, parkingId)
          .run();

        const updated = await env.DB.prepare(
          "SELECT rr.id, rr.parking_id as parkingId, rr.person_id as personId, rr.invitation_id as invitationId, " +
            "rr.previous_parking_id as previousParkingId, rr.status, rr.created_at as createdAt, rr.updated_at as updatedAt, " +
            "p.name as parkingName, c.name as cityName, u.name as personName, u.email as personEmail " +
            "FROM rider_requests rr " +
            "JOIN parkings p ON rr.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities c ON b.city_id = c.id " +
            "JOIN persons u ON rr.person_id = u.id " +
            "WHERE rr.id = ?"
        )
          .bind(reqId)
          .first<any>();

        return jsonResponse({ ...updated, isSwitch: Boolean(updated?.previousParkingId) });
      }

      // Manager: List active riders at parking stand
      if (
        pathname.startsWith("/api/me/parkings/") &&
        pathname.endsWith("/riders") &&
        request.method === "GET"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/me/parkings/", "").replace("/riders", "")
        );

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();

        if (!isManager) {
          return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
        }

        const res = await env.DB.prepare(
          "SELECT pr.id, pr.parking_id as parkingId, pr.person_id as personId, pr.assigned_by as assignedBy, pr.created_at as createdAt, " +
            "p.name as parkingName, c.name as cityName, u.name as personName, u.email as personEmail " +
            "FROM parking_riders pr " +
            "JOIN parkings p ON pr.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities c ON b.city_id = c.id " +
            "JOIN persons u ON pr.person_id = u.id " +
            "WHERE pr.parking_id = ? " +
            "ORDER BY u.name ASC"
        )
          .bind(parkingId)
          .all<any>();

        return jsonResponse(res.results || []);
      }

      // List cycles at a parking lot
      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.endsWith("/cycles") &&
        request.method === "GET"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/parkings/", "").replace("/cycles", "")
        );

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();
        if (!isManager) {
          return jsonResponse({ error: "Forbidden: Not manager of this parking lot" }, 403);
        }

        const res = await env.DB.prepare(
          "SELECT c.id, c.public_cycle_id, c.parking_id, c.company, c.model, c.colour, c.status, " +
            "c.lock_code, c.qr_code, c.created_at, c.updated_at, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycles c " +
            "LEFT JOIN parkings p ON c.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities ci ON b.city_id = ci.id " +
            "WHERE c.parking_id = ? " +
            "ORDER BY c.public_cycle_id"
        )
          .bind(parkingId)
          .all<any>();

        const formatted = (res.results || []).map((row) =>
          formatCycle(row, "https://bycme-staging.pages.dev")
        );
        return jsonResponse(formatted);
      }

      // Add new cycle to a parking lot
      if (
        pathname.startsWith("/api/parkings/") &&
        pathname.endsWith("/cycles") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const parkingId = decodeURIComponent(
          pathname.replace("/api/parkings/", "").replace("/cycles", "")
        );

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(parkingId, caller.id)
          .first();
        if (!isManager) {
          return jsonResponse({ error: "Forbidden: Not manager of this parking lot" }, 403);
        }

        const body = (await request.json()) as {
          publicCycleId?: string;
          brand?: string;
          cycleModel?: string;
          colour?: string;
          status?: string;
          lockCode?: string;
          qrCode?: string;
        };

        if (
          !body.brand?.trim() ||
          !body.cycleModel?.trim() ||
          !body.colour?.trim() ||
          !body.lockCode?.trim()
        ) {
          return jsonResponse(
            { error: "brand, cycleModel, colour, and lockCode are required" },
            400
          );
        }

        const lockCode = body.lockCode.trim();
        if (!/^\d+$/.test(lockCode)) {
          return jsonResponse(
            { error: "Combination lock code must contain numbers only" },
            400
          );
        }

        let publicId = body.publicCycleId?.trim().toUpperCase();
        if (!publicId) {
          const locInfo = await env.DB.prepare(
            "SELECT c.name as city_name FROM parkings p " +
              "JOIN buildings b ON p.building_id = b.id " +
              "JOIN cities c ON b.city_id = c.id " +
              "WHERE p.id = ?"
          )
            .bind(parkingId)
            .first<{ city_name: string }>();

          const prefix = locInfo?.city_name
            ? locInfo.city_name.slice(0, 3).toUpperCase()
            : "CYC";

          const existingCycles = await env.DB.prepare(
            "SELECT public_cycle_id FROM cycles WHERE public_cycle_id LIKE ?"
          )
            .bind(`${prefix}-%`)
            .all<{ public_cycle_id: string }>();

          let maxSeq = 0;
          for (const row of existingCycles.results || []) {
            const parts = row.public_cycle_id.split("-");
            if (parts.length >= 2) {
              const num = parseInt(parts[1], 10);
              if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
              }
            }
          }
          publicId = `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
        } else {
          const existingId = await env.DB.prepare(
            "SELECT id FROM cycles WHERE LOWER(public_cycle_id) = LOWER(?)"
          )
            .bind(publicId)
            .first();
          if (existingId) {
            return jsonResponse({ error: `Cycle with ID '${publicId}' already exists` }, 400);
          }
        }

        const qrCode = body.qrCode?.trim() || generateCompactToken();
        const existingQr = await env.DB.prepare("SELECT id FROM cycles WHERE qr_code = ?")
          .bind(qrCode)
          .first();
        if (existingQr) {
          return jsonResponse({ error: "Cycle with this QR code already exists" }, 400);
        }

        const id = `cyc-${crypto.randomUUID().slice(0, 8)}`;
        const status =
          body.status === "Puncture" || body.status === "Broken" ? body.status : "Working";

        await env.DB.prepare(
          "INSERT INTO cycles (id, public_cycle_id, parking_id, company, model, colour, status, lock_code, qr_code) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
          .bind(
            id,
            publicId,
            parkingId,
            body.brand.trim(),
            body.cycleModel.trim(),
            body.colour.trim(),
            status,
            body.lockCode.trim(),
            qrCode
          )
          .run();

        const created = await env.DB.prepare(
          "SELECT c.id, c.public_cycle_id, c.parking_id, c.company, c.model, c.colour, c.status, " +
            "c.lock_code, c.qr_code, c.created_at, c.updated_at, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycles c " +
            "LEFT JOIN parkings p ON c.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities ci ON b.city_id = ci.id " +
            "WHERE c.id = ?"
        )
          .bind(id)
          .first<any>();

        return jsonResponse(formatCycle(created, "https://bycme-staging.pages.dev"), 201);
      }

      // Update cycle details
      if (pathname.startsWith("/api/cycles/") && !pathname.includes("/lookup/") && request.method === "PUT") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
        }

        const cycleId = decodeURIComponent(pathname.replace("/api/cycles/", ""));
        const existing = await env.DB.prepare("SELECT * FROM cycles WHERE id = ?")
          .bind(cycleId)
          .first<any>();

        if (!existing) {
          return jsonResponse({ error: "Cycle not found" }, 404);
        }

        const isManager = await env.DB.prepare(
          "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
        )
          .bind(existing.parking_id, caller.id)
          .first();
        if (!isManager) {
          return jsonResponse({ error: "Forbidden: Not manager of this cycle's parking lot" }, 403);
        }

        const body = (await request.json()) as {
          brand?: string;
          cycleModel?: string;
          colour?: string;
          status?: string;
          lockCode?: string;
          qrCode?: string;
          parkingId?: string;
        };

        const newCompany = body.brand !== undefined ? body.brand.trim() : existing.company;
        const newModel = body.cycleModel !== undefined ? body.cycleModel.trim() : existing.model;
        const newColour = body.colour !== undefined ? body.colour.trim() : existing.colour;
        const newStatus =
          body.status === "Working" || body.status === "Puncture" || body.status === "Broken"
            ? body.status
            : existing.status;
        const newLockCode = body.lockCode !== undefined ? body.lockCode.trim() : existing.lock_code;
        if (body.lockCode !== undefined && !/^\d+$/.test(newLockCode)) {
          return jsonResponse(
            { error: "Combination lock code must contain numbers only" },
            400
          );
        }
        const newQrCode = body.qrCode !== undefined ? body.qrCode.trim() : existing.qr_code;
        const newParkingId = body.parkingId !== undefined ? body.parkingId : existing.parking_id;

        if (newQrCode !== existing.qr_code) {
          const dupQr = await env.DB.prepare("SELECT id FROM cycles WHERE qr_code = ? AND id != ?")
            .bind(newQrCode, cycleId)
            .first();
          if (dupQr) {
            return jsonResponse({ error: "Cycle with this QR code already exists" }, 400);
          }
        }

        await env.DB.prepare(
          "UPDATE cycles SET company = ?, model = ?, colour = ?, status = ?, lock_code = ?, qr_code = ?, parking_id = ?, updated_at = datetime('now') WHERE id = ?"
        )
          .bind(
            newCompany,
            newModel,
            newColour,
            newStatus,
            newLockCode,
            newQrCode,
            newParkingId,
            cycleId
          )
          .run();

        const updated = await env.DB.prepare(
          "SELECT c.id, c.public_cycle_id, c.parking_id, c.company, c.model, c.colour, c.status, " +
            "c.lock_code, c.qr_code, c.created_at, c.updated_at, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycles c " +
            "LEFT JOIN parkings p ON c.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities ci ON b.city_id = ci.id " +
            "WHERE c.id = ?"
        )
          .bind(cycleId)
          .first<any>();

        return jsonResponse(formatCycle(updated, "https://bycme-staging.pages.dev"));
      }

      // Lookup cycle by publicCycleId or qr_code
      if (pathname.startsWith("/api/cycles/lookup/") && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        const identifier = decodeURIComponent(pathname.replace("/api/cycles/lookup/", ""));

        const row = await env.DB.prepare(
          "SELECT c.id, c.public_cycle_id, c.parking_id, c.company, c.model, c.colour, c.status, " +
            "c.lock_code, c.qr_code, c.created_at, c.updated_at, " +
            "p.name as parking_name, ci.name as city_name, " +
            "co.id as active_co_id, co.person_id as active_rider_id " +
            "FROM cycles c " +
            "LEFT JOIN parkings p ON c.parking_id = p.id " +
            "LEFT JOIN buildings b ON p.building_id = b.id " +
            "LEFT JOIN cities ci ON b.city_id = ci.id " +
            "LEFT JOIN cycle_checkouts co ON c.id = co.cycle_id AND co.status = 'active' " +
            "WHERE LOWER(c.public_cycle_id) = LOWER(?) OR c.qr_code = ?"
        )
          .bind(identifier, identifier)
          .first<any>();

        if (!row) {
          return jsonResponse({ error: "Cycle not found" }, 404);
        }

        let canViewLockCode = false;
        let isCheckedOutByMe = false;
        if (caller) {
          if (row.active_rider_id === caller.id) {
            canViewLockCode = true;
            isCheckedOutByMe = true;
          } else if (caller.roles.includes("Admin")) {
            canViewLockCode = true;
          } else if (caller.roles.includes("Manager")) {
            const isMgr = await env.DB.prepare(
              "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
            )
              .bind(row.parking_id, caller.id)
              .first();
            if (isMgr) canViewLockCode = true;
          }
        }

        const isAvailable = !row.active_co_id && row.status === "Working";

        return jsonResponse(
          formatCycle(
            row,
            "https://bycme-staging.pages.dev",
            canViewLockCode,
            isAvailable,
            isCheckedOutByMe
          )
        );
      }

      // Rider: Get caller's active cycle checkout
      if (pathname === "/api/me/active-checkout" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const row = await env.DB.prepare(
          "SELECT co.id, co.cycle_id, co.person_id, co.parking_id, co.checked_out_at, co.returned_at, co.status, " +
            "co.return_condition, co.return_notes, " +
            "c.public_cycle_id, c.company, c.model, c.colour, c.lock_code, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycle_checkouts co " +
            "JOIN cycles c ON co.cycle_id = c.id " +
            "JOIN parkings p ON co.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "WHERE co.person_id = ? AND co.status = 'active'"
        )
          .bind(caller.id)
          .first<any>();

        return jsonResponse({
          activeCheckout: row ? formatCycleCheckout(row) : null,
        });
      }

      // Rider: Get home parking stand details and fleet
      if (pathname === "/api/me/home-parking" && request.method === "GET") {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const riderAssignment = await env.DB.prepare(
          "SELECT parking_id FROM parking_riders WHERE person_id = ?"
        )
          .bind(caller.id)
          .first<{ parking_id: string }>();

        if (!riderAssignment) {
          return jsonResponse(
            { error: "You are not assigned to any bicycle parking stand. Please join a parking stand via invitation." },
            404
          );
        }

        const parking = await env.DB.prepare(
          "SELECT p.id, p.name, p.capacity, p.building_id as buildingId, p.created_at as createdAt, " +
            "b.name as buildingName, ci.name as cityName, b.building_type as buildingType " +
            "FROM parkings p " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "WHERE p.id = ?"
        )
          .bind(riderAssignment.parking_id)
          .first<any>();

        if (!parking) {
          return jsonResponse({ error: "Parking stand not found" }, 404);
        }

        const activeCoRow = await env.DB.prepare(
          "SELECT co.id, co.cycle_id, co.person_id, co.parking_id, co.checked_out_at, co.returned_at, co.status, " +
            "co.return_condition, co.return_notes, " +
            "c.public_cycle_id, c.company, c.model, c.colour, c.lock_code, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycle_checkouts co " +
            "JOIN cycles c ON co.cycle_id = c.id " +
            "JOIN parkings p ON co.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "WHERE co.person_id = ? AND co.status = 'active'"
        )
          .bind(caller.id)
          .first<any>();

        const activeCheckout = activeCoRow ? formatCycleCheckout(activeCoRow) : undefined;

        const cyclesRes = await env.DB.prepare(
          "SELECT c.id, c.public_cycle_id, c.parking_id, c.company, c.model, c.colour, c.status, " +
            "c.lock_code, c.qr_code, c.created_at, c.updated_at, " +
            "p.name as parking_name, ci.name as city_name, " +
            "co.id as active_co_id, co.person_id as active_rider_id " +
            "FROM cycles c " +
            "JOIN parkings p ON c.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "LEFT JOIN cycle_checkouts co ON c.id = co.cycle_id AND co.status = 'active' " +
            "WHERE c.parking_id = ? " +
            "ORDER BY c.public_cycle_id ASC"
        )
          .bind(riderAssignment.parking_id)
          .all<any>();

        const cycles = (cyclesRes.results || []).map((c) => {
          const isCheckedOutByMe = c.active_rider_id === caller.id;
          const isAvailable = !c.active_co_id && c.status === "Working";
          return formatCycle(
            c,
            "https://bycme-staging.pages.dev",
            isCheckedOutByMe,
            isAvailable,
            isCheckedOutByMe
          );
        });

        return jsonResponse({
          parking,
          cycles,
          activeCheckout,
        });
      }

      // Rider: Checkout cycle
      if (
        pathname.startsWith("/api/cycles/") &&
        pathname.endsWith("/checkout") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }
        if (!caller.roles.includes("Rider")) {
          return jsonResponse({ error: "Forbidden: Rider role required" }, 403);
        }

        const cycleId = decodeURIComponent(
          pathname.replace("/api/cycles/", "").replace("/checkout", "")
        );

        // Verification 1: Rider assigned home parking stand
        const riderAssignment = await env.DB.prepare(
          "SELECT parking_id FROM parking_riders WHERE person_id = ?"
        )
          .bind(caller.id)
          .first<{ parking_id: string }>();

        if (!riderAssignment) {
          return jsonResponse(
            { error: "You are not assigned to any parking stand. Please join a parking stand via invitation." },
            403
          );
        }

        // Verification 2: Maximum 1 active checkout per rider
        const existingCheckout = await env.DB.prepare(
          "SELECT id FROM cycle_checkouts WHERE person_id = ? AND status = 'active'"
        )
          .bind(caller.id)
          .first();

        if (existingCheckout) {
          return jsonResponse(
            { error: "You already have an active cycle checkout. Return your active cycle before checking out another." },
            400
          );
        }

        // Verification 3: Cycle exists
        const cycle = await env.DB.prepare(
          "SELECT c.id, c.parking_id, c.company, c.model, c.colour, c.status, c.lock_code, c.public_cycle_id, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycles c " +
            "JOIN parkings p ON c.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "WHERE c.id = ?"
        )
          .bind(cycleId)
          .first<any>();

        if (!cycle) {
          return jsonResponse({ error: "Cycle not found" }, 404);
        }

        // Verification 4: Belongs to rider's home stand
        if (cycle.parking_id !== riderAssignment.parking_id) {
          return jsonResponse(
            {
              error: `Cycle belongs to ${cycle.parking_name}${cycle.city_name ? ` (${cycle.city_name})` : ""}. You can only checkout cycles at your registered home stand.`,
            },
            403
          );
        }

        // Verification 5: Cycle condition is Working
        if (cycle.status !== "Working") {
          return jsonResponse(
            { error: `This cycle is currently marked as '${cycle.status}' and is unavailable for checkout.` },
            400
          );
        }

        // Verification 6: Not currently checked out
        const activeCycleCheckout = await env.DB.prepare(
          "SELECT id FROM cycle_checkouts WHERE cycle_id = ? AND status = 'active'"
        )
          .bind(cycleId)
          .first();

        if (activeCycleCheckout) {
          return jsonResponse(
            { error: "This cycle is currently in use by another rider." },
            409
          );
        }

        // Create checkout session
        const checkoutId = `co-${crypto.randomUUID().slice(0, 8)}`;
        await env.DB.prepare(
          "INSERT INTO cycle_checkouts (id, cycle_id, person_id, parking_id, status) VALUES (?, ?, ?, ?, 'active')"
        )
          .bind(checkoutId, cycleId, caller.id, cycle.parking_id)
          .run();

        const coRow = await env.DB.prepare(
          "SELECT co.id, co.cycle_id, co.person_id, co.parking_id, co.checked_out_at, co.returned_at, co.status, " +
            "co.return_condition, co.return_notes, " +
            "c.public_cycle_id, c.company, c.model, c.colour, c.lock_code, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycle_checkouts co " +
            "JOIN cycles c ON co.cycle_id = c.id " +
            "JOIN parkings p ON co.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "WHERE co.id = ?"
        )
          .bind(checkoutId)
          .first<any>();

        return jsonResponse(formatCycleCheckout(coRow), 201);
      }

      // Rider / Manager: Return checked-out cycle
      if (
        pathname.startsWith("/api/checkouts/") &&
        pathname.endsWith("/return") &&
        request.method === "POST"
      ) {
        const caller = await authenticateRequest(request, env);
        if (!caller) {
          return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
        }

        const checkoutId = decodeURIComponent(
          pathname.replace("/api/checkouts/", "").replace("/return", "")
        );

        const checkout = await env.DB.prepare(
          "SELECT id, cycle_id, person_id, parking_id, status FROM cycle_checkouts WHERE id = ?"
        )
          .bind(checkoutId)
          .first<{ id: string; cycle_id: string; person_id: string; parking_id: string; status: string }>();

        if (!checkout) {
          return jsonResponse({ error: "Checkout session not found" }, 404);
        }

        if (checkout.person_id !== caller.id && !caller.roles.includes("Admin") && !caller.roles.includes("Manager")) {
          return jsonResponse({ error: "Forbidden: You do not own this checkout session" }, 403);
        }

        if (checkout.status !== "active") {
          return jsonResponse({ error: "This cycle checkout is already marked returned" }, 400);
        }

        let condition = "Working";
        let notes: string | null = null;
        try {
          const body = await request.json<any>();
          if (body) {
            if (body.condition && ["Working", "Puncture", "Broken"].includes(body.condition)) {
              condition = body.condition;
            }
            if (typeof body.notes === "string" && body.notes.trim()) {
              notes = body.notes.trim();
            }
          }
        } catch {
          // Body is optional
        }

        await env.DB.prepare(
          "UPDATE cycle_checkouts SET status = 'returned', returned_at = datetime('now'), return_condition = ?, return_notes = ? WHERE id = ?"
        )
          .bind(condition, notes, checkoutId)
          .run();

        if (condition !== "Working") {
          await env.DB.prepare(
            "UPDATE cycles SET status = ?, updated_at = datetime('now') WHERE id = ?"
          )
            .bind(condition, checkout.cycle_id)
            .run();
        }

        const updated = await env.DB.prepare(
          "SELECT co.id, co.cycle_id, co.person_id, co.parking_id, co.checked_out_at, co.returned_at, co.status, " +
            "co.return_condition, co.return_notes, " +
            "c.public_cycle_id, c.company, c.model, c.colour, c.lock_code, " +
            "p.name as parking_name, ci.name as city_name " +
            "FROM cycle_checkouts co " +
            "JOIN cycles c ON co.cycle_id = c.id " +
            "JOIN parkings p ON co.parking_id = p.id " +
            "JOIN buildings b ON p.building_id = b.id " +
            "JOIN cities ci ON b.city_id = ci.id " +
            "WHERE co.id = ?"
        )
          .bind(checkoutId)
          .first<any>();

        return jsonResponse(formatCycleCheckout(updated));
      }

      return jsonResponse({ error: "Not Found" }, 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      return jsonResponse({ error: message }, 500);
    }
  },
};
