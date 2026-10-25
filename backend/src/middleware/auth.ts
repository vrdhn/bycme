/**
 * Authentication and authorization middleware helpers.
 */

import { Env, AuthUser } from "../types";
import { verifySessionToken } from "../utils/crypto";

/**
 * Fetch person record along with assigned roles and resolved parking from database.
 */
export async function getPersonWithRoles(
  db: D1Database,
  userId: string
): Promise<AuthUser | null> {
  const person = await db
    .prepare(
      `SELECT id, email, name, dob, gender, mobile, comments, address,
              emergency_name, emergency_phone1, emergency_phone2, created_at
       FROM persons WHERE id = ?`
    )
    .bind(userId)
    .first<{
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
      created_at: string;
    }>();

  if (!person) return null;

  const roleRows = await db
    .prepare("SELECT role FROM person_roles WHERE person_id = ? ORDER BY role")
    .bind(userId)
    .all<{ role: string }>();

  // Resolve associated parking stand (rider first, then manager fallback)
  let parkingRow = await db
    .prepare(
      `SELECT pr.parking_id as parkingId, p.name as parkingName
       FROM parking_riders pr
       JOIN parkings p ON p.id = pr.parking_id
       WHERE pr.person_id = ?`
    )
    .bind(userId)
    .first<{ parkingId: string; parkingName: string }>();

  if (!parkingRow) {
    parkingRow = await db
      .prepare(
        `SELECT pm.parking_id as parkingId, p.name as parkingName
         FROM parking_managers pm
         JOIN parkings p ON p.id = pm.parking_id
         WHERE pm.person_id = ?
         LIMIT 1`
      )
      .bind(userId)
      .first<{ parkingId: string; parkingName: string }>();
  }

  const emergencyContact =
    person.emergency_name || person.emergency_phone1 || person.emergency_phone2
      ? {
          name: person.emergency_name || undefined,
          phone1: person.emergency_phone1 || undefined,
          phone2: person.emergency_phone2 || undefined,
        }
      : undefined;

  return {
    id: person.id,
    email: person.email,
    name: person.name,
    parkingId: parkingRow?.parkingId || undefined,
    parkingName: parkingRow?.parkingName || undefined,
    dob: person.dob || undefined,
    gender: (person.gender as AuthUser["gender"]) || undefined,
    mobile: person.mobile || undefined,
    comments: person.comments || undefined,
    address: person.address || undefined,
    emergencyContact,
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
