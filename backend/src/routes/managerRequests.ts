/**
 * Manager requests review and approval endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import { authenticateRequest } from "../middleware/auth";

/**
 * Endpoint: GET /api/me/manager-requests
 * Auth: Bearer token
 * Description: List current user's submitted manager requests.
 */
export async function handleGetMyManagerRequests(
  request: Request,
  env: Env
): Promise<Response> {
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

/**
 * Endpoint: GET /api/admin/manager-requests
 * Auth: Bearer token (Admin only)
 * Description: List all submitted manager requests across all parking stands.
 */
export async function handleAdminListManagerRequests(
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

/**
 * Endpoint: POST /api/admin/manager-requests/{id}/approve
 * Auth: Bearer token (Admin only)
 * Description: Approve manager request, create parking_managers entry, and assign Manager role.
 */
export async function handleAdminApproveManagerRequest(
  request: Request,
  env: Env,
  reqId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

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

  if (reqRow.status !== "pending") {
    return jsonResponse(
      { error: `Cannot approve request: request is already ${reqRow.status}.` },
      400
    );
  }

  if (reqRow.building_type !== "Private") {
    return jsonResponse(
      { error: "Cannot approve manager request: target parking belongs to a public building." },
      400
    );
  }

  // Update request status atomically
  const updateRes = await env.DB.prepare(
    "UPDATE manager_requests SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'pending'"
  )
    .bind(reqId)
    .run();

  const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
  if (changes < 1) {
    return jsonResponse(
      { error: "Cannot approve request: request was already processed or is no longer pending." },
      409
    );
  }

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

/**
 * Endpoint: POST /api/admin/manager-requests/{id}/reject
 * Auth: Bearer token (Admin only)
 * Description: Reject manager request.
 */
export async function handleAdminRejectManagerRequest(
  request: Request,
  env: Env,
  reqId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

  const reqRow = await env.DB.prepare("SELECT id, status FROM manager_requests WHERE id = ?")
    .bind(reqId)
    .first<any>();

  if (!reqRow) {
    return jsonResponse({ error: "Manager request not found" }, 404);
  }

  if (reqRow.status !== "pending") {
    return jsonResponse(
      { error: `Cannot reject request: request is already ${reqRow.status}.` },
      400
    );
  }

  const updateRes = await env.DB.prepare(
    "UPDATE manager_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ? AND status = 'pending'"
  )
    .bind(reqId)
    .run();

  const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
  if (changes < 1) {
    return jsonResponse(
      { error: "Cannot reject request: request was already processed or is no longer pending." },
      409
    );
  }

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

/**
 * Route dispatcher for manager requests endpoints.
 */
export async function handleManagerRequestsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  if (pathname === "/api/me/manager-requests" && request.method === "GET") {
    return handleGetMyManagerRequests(request, env);
  }

  if (pathname === "/api/admin/manager-requests" && request.method === "GET") {
    return handleAdminListManagerRequests(request, env);
  }

  if (
    pathname.startsWith("/api/admin/manager-requests/") &&
    pathname.endsWith("/approve") &&
    request.method === "POST"
  ) {
    const reqId = decodeURIComponent(
      pathname.replace("/api/admin/manager-requests/", "").replace("/approve", "")
    );
    return handleAdminApproveManagerRequest(request, env, reqId);
  }

  if (
    pathname.startsWith("/api/admin/manager-requests/") &&
    pathname.endsWith("/reject") &&
    request.method === "POST"
  ) {
    const reqId = decodeURIComponent(
      pathname.replace("/api/admin/manager-requests/", "").replace("/reject", "")
    );
    return handleAdminRejectManagerRequest(request, env, reqId);
  }

  return null;
}
