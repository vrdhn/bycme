/**
 * Authentication and authorization middleware helpers.
 */

import { Env, AuthUser } from "../types";
import { verifySessionToken } from "../utils/crypto";

/**
 * Fetch person record along with assigned roles from database.
 */
export async function getPersonWithRoles(
  db: D1Database,
  userId: string
): Promise<AuthUser | null> {
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

/**
 * Authenticate incoming request using Bearer session token.
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return null;
  const userId = await verifySessionToken(tokenMatch[1]);
  if (!userId) return null;
  return getPersonWithRoles(env.DB, userId);
}
