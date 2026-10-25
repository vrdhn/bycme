/**
 * User authentication and profile endpoints.
 */

import { Env, PersonRow } from "../types";
import { jsonResponse } from "../utils/response";
import {
  verifyPassword,
  hashPassword,
  createSessionToken,
} from "../utils/crypto";
import {
  authenticateRequest,
  getPersonWithRoles,
} from "../middleware/auth";

/**
 * Endpoint: POST /api/auth/login
 * Auth: None
 * Description: Verify user credentials and issue signed session token.
 */
export async function handleLogin(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) {
    return jsonResponse({ error: "Email and password required" }, 400);
  }

  const userRow = await env.DB.prepare(
    "SELECT id, email, name, password_hash, password_salt, created_at FROM persons WHERE LOWER(email) = LOWER(?)"
  )
    .bind(body.email.trim())
    .first<PersonRow>();

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

/**
 * Endpoint: POST /api/auth/register
 * Auth: None
 * Description: Register a new person account and issue signed session token.
 */
export async function handleRegister(
  request: Request,
  env: Env
): Promise<Response> {
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

/**
 * Endpoint: GET /api/auth/me
 * Auth: Bearer token
 * Description: Return currently authenticated person profile and roles.
 */
export async function handleGetMe(
  request: Request,
  env: Env
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  return jsonResponse(caller);
}

/**
 * Endpoint: PUT /api/auth/me
 * Auth: Bearer token
 * Description: Update personal details and emergency contact for authenticated user.
 */
export async function handleUpdateMyProfile(
  request: Request,
  env: Env
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }

  const body = (await request.json()) as {
    name?: string;
    dob?: string;
    gender?: string;
    mobile?: string;
    address?: string;
    emergencyContact?: { name?: string; phone1?: string; phone2?: string };
  };

  const name = body.name !== undefined ? body.name.trim() : caller.name;
  if (!name) {
    return jsonResponse({ error: "Name cannot be empty" }, 400);
  }

  const dob = body.dob !== undefined ? body.dob.trim() || null : caller.dob || null;
  const gender = body.gender !== undefined ? body.gender.trim() || null : caller.gender || null;
  const mobile = body.mobile !== undefined ? body.mobile.trim() || null : caller.mobile || null;
  const address = body.address !== undefined ? body.address.trim() || null : caller.address || null;

  const emg = body.emergencyContact;
  const emgName = emg !== undefined ? emg.name?.trim() || null : caller.emergencyContact?.name || null;
  const emgPhone1 = emg !== undefined ? emg.phone1?.trim() || null : caller.emergencyContact?.phone1 || null;
  const emgPhone2 = emg !== undefined ? emg.phone2?.trim() || null : caller.emergencyContact?.phone2 || null;

  await env.DB.prepare(
    `UPDATE persons
     SET name = ?, dob = ?, gender = ?, mobile = ?, address = ?,
         emergency_name = ?, emergency_phone1 = ?, emergency_phone2 = ?
     WHERE id = ?`
  )
    .bind(name, dob, gender, mobile, address, emgName, emgPhone1, emgPhone2, caller.id)
    .run();

  const updated = await getPersonWithRoles(env.DB, caller.id);
  return jsonResponse(updated);
}

/**
 * Endpoint: GET /api/persons
 * Auth: Bearer token (Admin only)
 * Description: List all registered persons with their assigned roles and personal details.
 */
export async function handleListPersons(
  request: Request,
  env: Env
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

  const personsResult = await env.DB.prepare(
    `SELECT id, email, name, dob, gender, mobile, comments, address,
            emergency_name, emergency_phone1, emergency_phone2, created_at as createdAt
     FROM persons ORDER BY name`
  ).all<{
    id: string;
    email: string;
    name: string;
    dob: string | null;
    gender: string | null;
    mobile: string | null;
    comments: string | null;
    address: string | null;
    emergency_name: string | null;
    emergency_phone1: string | null;
    emergency_phone2: string | null;
    createdAt: string;
  }>();

  const rolesResult = await env.DB.prepare(
    "SELECT person_id as personId, role FROM person_roles"
  ).all<{ personId: string; role: string }>();

  // Rider parking associations
  const riderParkingsResult = await env.DB.prepare(
    `SELECT pr.person_id as personId, pr.parking_id as parkingId, p.name as parkingName
     FROM parking_riders pr
     JOIN parkings p ON p.id = pr.parking_id`
  ).all<{ personId: string; parkingId: string; parkingName: string }>();

  // Manager parking associations (fallback for managers who aren't riders)
  const managerParkingsResult = await env.DB.prepare(
    `SELECT pm.person_id as personId, pm.parking_id as parkingId, p.name as parkingName
     FROM parking_managers pm
     JOIN parkings p ON p.id = pm.parking_id`
  ).all<{ personId: string; parkingId: string; parkingName: string }>();

  const rolesByPerson: Record<string, string[]> = {};
  for (const r of rolesResult.results || []) {
    if (!rolesByPerson[r.personId]) rolesByPerson[r.personId] = [];
    rolesByPerson[r.personId].push(r.role);
  }

  const parkingByPerson: Record<string, { parkingId: string; parkingName: string }> = {};
  for (const mp of managerParkingsResult.results || []) {
    parkingByPerson[mp.personId] = { parkingId: mp.parkingId, parkingName: mp.parkingName };
  }
  for (const rp of riderParkingsResult.results || []) {
    parkingByPerson[rp.personId] = { parkingId: rp.parkingId, parkingName: rp.parkingName };
  }

  const persons = (personsResult.results || []).map((p) => {
    const prk = parkingByPerson[p.id];
    const emergencyContact =
      p.emergency_name || p.emergency_phone1 || p.emergency_phone2
        ? {
            name: p.emergency_name || undefined,
            phone1: p.emergency_phone1 || undefined,
            phone2: p.emergency_phone2 || undefined,
          }
        : undefined;

    return {
      id: p.id,
      email: p.email,
      name: p.name,
      parkingId: prk?.parkingId || undefined,
      parkingName: prk?.parkingName || undefined,
      dob: p.dob || undefined,
      gender: p.gender || undefined,
      mobile: p.mobile || undefined,
      comments: p.comments || undefined,
      address: p.address || undefined,
      emergencyContact,
      roles: rolesByPerson[p.id] || [],
      createdAt: p.createdAt,
    };
  });

  return jsonResponse(persons);
}

/**
 * Endpoint: PUT /api/persons/:id
 * Auth: Bearer token (Admin only)
 * Description: Admin update of a person's profile, contact info, and internal comments.
 */
export async function handleAdminUpdatePerson(
  request: Request,
  env: Env,
  personId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

  const target = await getPersonWithRoles(env.DB, personId);
  if (!target) {
    return jsonResponse({ error: "Person not found" }, 404);
  }

  const body = (await request.json()) as {
    name?: string;
    dob?: string;
    gender?: string;
    mobile?: string;
    comments?: string;
    address?: string;
    emergencyContact?: { name?: string; phone1?: string; phone2?: string };
  };

  const name = body.name !== undefined ? body.name.trim() : target.name;
  if (!name) {
    return jsonResponse({ error: "Name cannot be empty" }, 400);
  }

  const dob = body.dob !== undefined ? body.dob.trim() || null : target.dob || null;
  const gender = body.gender !== undefined ? body.gender.trim() || null : target.gender || null;
  const mobile = body.mobile !== undefined ? body.mobile.trim() || null : target.mobile || null;
  const comments = body.comments !== undefined ? body.comments.trim() || null : target.comments || null;
  const address = body.address !== undefined ? body.address.trim() || null : target.address || null;

  const emg = body.emergencyContact;
  const emgName = emg !== undefined ? emg.name?.trim() || null : target.emergencyContact?.name || null;
  const emgPhone1 = emg !== undefined ? emg.phone1?.trim() || null : target.emergencyContact?.phone1 || null;
  const emgPhone2 = emg !== undefined ? emg.phone2?.trim() || null : target.emergencyContact?.phone2 || null;

  await env.DB.prepare(
    `UPDATE persons
     SET name = ?, dob = ?, gender = ?, mobile = ?, comments = ?, address = ?,
         emergency_name = ?, emergency_phone1 = ?, emergency_phone2 = ?
     WHERE id = ?`
  )
    .bind(name, dob, gender, mobile, comments, address, emgName, emgPhone1, emgPhone2, personId)
    .run();

  const updated = await getPersonWithRoles(env.DB, personId);
  return jsonResponse(updated);
}

/**
 * Route dispatcher for authentication and user directory endpoints.
 */
export async function handleAuthRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  if (pathname === "/api/auth/login" && request.method === "POST") {
    return handleLogin(request, env);
  }
  if (pathname === "/api/auth/register" && request.method === "POST") {
    return handleRegister(request, env);
  }
  if (pathname === "/api/auth/me") {
    if (request.method === "GET") return handleGetMe(request, env);
    if (request.method === "PUT") return handleUpdateMyProfile(request, env);
  }
  if (pathname === "/api/persons" && request.method === "GET") {
    return handleListPersons(request, env);
  }
  const personMatch = pathname.match(/^\/api\/persons\/([^/]+)$/);
  if (personMatch && request.method === "PUT") {
    return handleAdminUpdatePerson(request, env, personMatch[1]);
  }

  return null;
}
