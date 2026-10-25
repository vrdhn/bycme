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
 * Endpoint: GET /api/persons
 * Auth: Bearer token (Admin only)
 * Description: List all registered persons with their assigned roles.
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
    "SELECT id, email, name, created_at as createdAt FROM persons ORDER BY name"
  ).all<{ id: string; email: string; name: string; createdAt: string }>();

  const rolesResult = await env.DB.prepare(
    "SELECT person_id as personId, role FROM person_roles"
  ).all<{ personId: string; role: string }>();

  const rolesByPerson: Record<string, string[]> = {};
  for (const r of rolesResult.results || []) {
    if (!rolesByPerson[r.personId]) rolesByPerson[r.personId] = [];
    rolesByPerson[r.personId].push(r.role);
  }

  const persons = (personsResult.results || []).map((p) => ({
    ...p,
    roles: rolesByPerson[p.id] || [],
  }));

  return jsonResponse(persons);
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
  if (pathname === "/api/auth/me" && request.method === "GET") {
    return handleGetMe(request, env);
  }
  if (pathname === "/api/persons" && request.method === "GET") {
    return handleListPersons(request, env);
  }

  return null;
}
