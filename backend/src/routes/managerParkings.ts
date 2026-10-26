/**
 * Manager managed parkings and rider management endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import { authenticateRequest } from "../middleware/auth";

/**
 * Endpoint: GET /api/me/parkings
 * Auth: Bearer token (Manager only)
 * Description: List parking stations assigned to and managed by caller.
 */
export async function handleGetMyManagedParkings(
  request: Request,
  env: Env
): Promise<Response> {
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

/**
 * Endpoint: GET /api/me/parkings/{id}/rider-requests
 * Auth: Bearer token (Manager only)
 * Description: List pending rider access and shed transfer requests for managed parking stand.
 */
export async function handleGetParkingRiderRequests(
  request: Request,
  env: Env,
  parkingId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Manager")) {
    return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
  }

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

/**
 * Endpoint: POST /api/me/parkings/{id}/rider-requests/{requestId}/approve
 * Auth: Bearer token (Manager only)
 * Description: Approve rider request, enforce single-shed constraint, and enroll rider.
 */
export async function handleApproveParkingRiderRequest(
  request: Request,
  env: Env,
  parkingId: string,
  reqId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Manager")) {
    return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
  }

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

  if (reqRow.status !== "pending") {
    return jsonResponse(
      { error: `Cannot approve request: request is already ${reqRow.status}.` },
      400
    );
  }

  // Update request status atomically
  const updateRes = await env.DB.prepare(
    "UPDATE rider_requests SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND parking_id = ? AND status = 'pending'"
  )
    .bind(reqId, parkingId)
    .run();

  const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
  if (changes < 1) {
    return jsonResponse(
      { error: "Cannot approve request: request was already processed or is no longer pending." },
      409
    );
  }

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

/**
 * Endpoint: POST /api/me/parkings/{id}/rider-requests/{requestId}/reject
 * Auth: Bearer token (Manager only)
 * Description: Reject rider request.
 */
export async function handleRejectParkingRiderRequest(
  request: Request,
  env: Env,
  parkingId: string,
  reqId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Manager")) {
    return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
  }

  const isManager = await env.DB.prepare(
    "SELECT id FROM parking_managers WHERE parking_id = ? AND person_id = ?"
  )
    .bind(parkingId, caller.id)
    .first();

  if (!isManager) {
    return jsonResponse({ error: "Forbidden: You are not a manager of this parking stand" }, 403);
  }

  const reqRow = await env.DB.prepare(
    "SELECT id, status FROM rider_requests WHERE id = ? AND parking_id = ?"
  )
    .bind(reqId, parkingId)
    .first<any>();

  if (!reqRow) {
    return jsonResponse({ error: "Rider request not found" }, 404);
  }

  if (reqRow.status !== "pending") {
    return jsonResponse(
      { error: `Cannot reject request: request is already ${reqRow.status}.` },
      400
    );
  }

  const updateRes = await env.DB.prepare(
    "UPDATE rider_requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ? AND parking_id = ? AND status = 'pending'"
  )
    .bind(reqId, parkingId)
    .run();

  const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
  if (changes < 1) {
    return jsonResponse(
      { error: "Cannot reject request: request was already processed or is no longer pending." },
      409
    );
  }

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

/**
 * Endpoint: GET /api/me/parkings/{id}/riders
 * Auth: Bearer token (Manager only)
 * Description: List active registered riders roster for managed parking stand.
 */
export async function handleListParkingRiders(
  request: Request,
  env: Env,
  parkingId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Manager")) {
    return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
  }

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
      "p.name as parkingName, c.name as cityName, u.name as personName, u.email as personEmail, " +
      "u.mobile as personMobile, u.emergency_name as emergencyName, u.emergency_phone1 as emergencyPhone1 " +
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

/**
 * Route dispatcher for manager parking and rider access endpoints.
 */
export async function handleManagerParkingsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  if (pathname === "/api/me/parkings" && request.method === "GET") {
    return handleGetMyManagedParkings(request, env);
  }

  if (
    pathname.startsWith("/api/me/parkings/") &&
    pathname.endsWith("/rider-requests") &&
    request.method === "GET"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/me/parkings/", "").replace("/rider-requests", "")
    );
    return handleGetParkingRiderRequests(request, env, parkingId);
  }

  if (
    pathname.startsWith("/api/me/parkings/") &&
    pathname.includes("/rider-requests/") &&
    pathname.endsWith("/approve") &&
    request.method === "POST"
  ) {
    const parts = pathname.replace("/api/me/parkings/", "").replace("/approve", "").split("/rider-requests/");
    const parkingId = decodeURIComponent(parts[0]);
    const reqId = decodeURIComponent(parts[1]);
    return handleApproveParkingRiderRequest(request, env, parkingId, reqId);
  }

  if (
    pathname.startsWith("/api/me/parkings/") &&
    pathname.includes("/rider-requests/") &&
    pathname.endsWith("/reject") &&
    request.method === "POST"
  ) {
    const parts = pathname.replace("/api/me/parkings/", "").replace("/reject", "").split("/rider-requests/");
    const parkingId = decodeURIComponent(parts[0]);
    const reqId = decodeURIComponent(parts[1]);
    return handleRejectParkingRiderRequest(request, env, parkingId, reqId);
  }

  if (
    pathname.startsWith("/api/me/parkings/") &&
    pathname.endsWith("/riders") &&
    request.method === "GET"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/me/parkings/", "").replace("/riders", "")
    );
    return handleListParkingRiders(request, env, parkingId);
  }

  return null;
}
