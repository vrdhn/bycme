/**
 * Manager and Rider invitations endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import { generateCompactToken } from "../utils/crypto";
import { formatManagerInvitation } from "../utils/formatters";
import { authenticateRequest } from "../middleware/auth";

/**
 * Endpoint: POST /api/parkings/{id}/manager-invitations
 * Auth: Bearer token (Admin only)
 * Description: Generate manager invitation link with configurable expiry for private parkings.
 */
export async function handleCreateManagerInvitation(
  request: Request,
  env: Env,
  parkingId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
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

/**
 * Endpoint: GET /api/parkings/{id}/manager-invitations
 * Auth: Bearer token (Admin only)
 * Description: List active unexpired manager invitations for a parking stand.
 */
export async function handleListManagerInvitations(
  request: Request,
  env: Env,
  parkingId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

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

/**
 * Endpoint: POST /api/parkings/{id}/rider-invitations
 * Auth: Bearer token (Manager only)
 * Description: Generate rider invitation link with configurable expiry for managed private parkings.
 */
export async function handleCreateRiderInvitation(
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

/**
 * Endpoint: GET /api/parkings/{id}/rider-invitations
 * Auth: Bearer token (Manager only)
 * Description: List active unexpired rider invitations for managed parking stand.
 */
export async function handleListRiderInvitations(
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

/**
 * Endpoint: POST /api/parkings/{id}/rider-invitations/{invitationId}/revoke
 * Auth: Bearer token (Manager only)
 * Description: Immediately revoke active rider invitation link.
 */
export async function handleRevokeRiderInvitation(
  request: Request,
  env: Env,
  parkingId: string,
  invId: string
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

/**
 * Endpoint: GET /api/invitations/{token}
 * Auth: Optional Bearer token (Public inspection)
 * Description: Look up invitation token details and caller's current stand assignment.
 */
export async function handleGetInvitationDetails(
  request: Request,
  env: Env,
  token: string
): Promise<Response> {
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

/**
 * Endpoint: POST /api/invitations/{token}/respond
 * Auth: Bearer token
 * Description: Claim pre-approved assignment or submit access application for Manager or Rider.
 */
export async function handleRespondToInvitation(
  request: Request,
  env: Env,
  token: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }

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
      const updateRes = await env.DB.prepare(
        "UPDATE invitations SET status = 'used' WHERE id = ? AND status = 'active'"
      )
        .bind(inv.id)
        .run();

      const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
      if (changes < 1) {
        return jsonResponse(
          { error: "Invitation was already redeemed or is no longer active" },
          409
        );
      }

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
    const updateRes = await env.DB.prepare(
      "UPDATE invitations SET status = 'used' WHERE id = ? AND status = 'active'"
    )
      .bind(inv.id)
      .run();

    const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
    if (changes < 1) {
      return jsonResponse(
        { error: "Invitation was already redeemed or is no longer active" },
        409
      );
    }

    const pmId = `pm-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare(
      "INSERT INTO parking_managers (id, parking_id, person_id, assigned_by) VALUES (?, ?, ?, ?)"
    )
      .bind(pmId, inv.parking_id, caller.id, inv.created_by)
      .run();

    const roleId = `role-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare(
      "INSERT OR IGNORE INTO person_roles (id, person_id, role) VALUES (?, ?, 'Manager')"
    )
      .bind(roleId, caller.id)
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

/**
 * Endpoint: GET /api/admin/invitations
 * Auth: Bearer token (Admin only)
 * Description: List invitations across all parking stations with joined details.
 */
export async function handleAdminListInvitations(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
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

/**
 * Endpoint: POST /api/admin/invitations/{id}/revoke
 * Auth: Bearer token (Admin only)
 * Description: Revoke or expire any invitation link immediately.
 */
export async function handleAdminRevokeInvitation(
  request: Request,
  env: Env,
  invId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

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

/**
 * Route dispatcher for invitation endpoints.
 */
export async function handleInvitationsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  // Manager Invitations by Parking
  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.endsWith("/manager-invitations") &&
    request.method === "POST"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/parkings/", "").replace("/manager-invitations", "")
    );
    return handleCreateManagerInvitation(request, env, parkingId);
  }

  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.endsWith("/manager-invitations") &&
    request.method === "GET"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/parkings/", "").replace("/manager-invitations", "")
    );
    return handleListManagerInvitations(request, env, parkingId);
  }

  // Rider Invitations by Parking
  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.endsWith("/rider-invitations") &&
    request.method === "POST"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/parkings/", "").replace("/rider-invitations", "")
    );
    return handleCreateRiderInvitation(request, env, parkingId);
  }

  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.endsWith("/rider-invitations") &&
    request.method === "GET"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/parkings/", "").replace("/rider-invitations", "")
    );
    return handleListRiderInvitations(request, env, parkingId);
  }

  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.includes("/rider-invitations/") &&
    pathname.endsWith("/revoke") &&
    request.method === "POST"
  ) {
    const parts = pathname
      .replace("/api/parkings/", "")
      .replace("/revoke", "")
      .split("/rider-invitations/");
    const parkingId = decodeURIComponent(parts[0]);
    const invId = decodeURIComponent(parts[1]);
    return handleRevokeRiderInvitation(request, env, parkingId, invId);
  }

  // Public Inspection & Respond
  if (
    pathname.startsWith("/api/invitations/") &&
    !pathname.endsWith("/respond") &&
    request.method === "GET"
  ) {
    const token = decodeURIComponent(pathname.replace("/api/invitations/", ""));
    return handleGetInvitationDetails(request, env, token);
  }

  if (
    pathname.startsWith("/api/invitations/") &&
    pathname.endsWith("/respond") &&
    request.method === "POST"
  ) {
    const token = decodeURIComponent(
      pathname.replace("/api/invitations/", "").replace("/respond", "")
    );
    return handleRespondToInvitation(request, env, token);
  }

  // Admin Invitations
  if (pathname === "/api/admin/invitations" && request.method === "GET") {
    return handleAdminListInvitations(request, env, url);
  }

  if (
    pathname.startsWith("/api/admin/invitations/") &&
    pathname.endsWith("/revoke") &&
    request.method === "POST"
  ) {
    const invId = decodeURIComponent(
      pathname.replace("/api/admin/invitations/", "").replace("/revoke", "")
    );
    return handleAdminRevokeInvitation(request, env, invId);
  }

  return null;
}
