/**
 * Cycles fleet and catalog lookup endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import { generateCompactToken } from "../utils/crypto";
import { formatCycle } from "../utils/formatters";
import { authenticateRequest } from "../middleware/auth";

/**
 * Endpoint: GET /api/parkings/{id}/cycles
 * Auth: Bearer token (Manager only)
 * Description: List cycles stationed at parking stand.
 */
export async function handleListParkingCycles(
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

/**
 * Endpoint: POST /api/parkings/{id}/cycles
 * Auth: Bearer token (Manager only)
 * Description: Register new cycle to parking stand (auto-generates cycle ID, validates numeric lock code).
 */
export async function handleCreateCycle(
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

/**
 * Endpoint: PUT /api/cycles/{id}
 * Auth: Bearer token (Manager only)
 * Description: Update cycle status, combination lock code, QR code, or metadata (validates numeric lock code).
 */
export async function handleUpdateCycle(
  request: Request,
  env: Env,
  cycleId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Manager")) {
    return jsonResponse({ error: "Forbidden: Manager role required" }, 403);
  }

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

/**
 * Endpoint: GET /api/cycles/lookup/{identifier}
 * Auth: Optional Bearer token (Reveals lock code only to authorized rider/manager/admin)
 * Description: Look up bicycle details by publicCycleId or QR token.
 */
export async function handleLookupCycle(
  request: Request,
  env: Env,
  identifier: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);

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

/**
 * Route dispatcher for cycle inventory and lookup endpoints.
 */
export async function handleCyclesRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.endsWith("/cycles") &&
    request.method === "GET"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/parkings/", "").replace("/cycles", "")
    );
    return handleListParkingCycles(request, env, parkingId);
  }

  if (
    pathname.startsWith("/api/parkings/") &&
    pathname.endsWith("/cycles") &&
    request.method === "POST"
  ) {
    const parkingId = decodeURIComponent(
      pathname.replace("/api/parkings/", "").replace("/cycles", "")
    );
    return handleCreateCycle(request, env, parkingId);
  }

  if (
    pathname.startsWith("/api/cycles/") &&
    !pathname.includes("/lookup/") &&
    !pathname.endsWith("/checkout") &&
    request.method === "PUT"
  ) {
    const cycleId = decodeURIComponent(pathname.replace("/api/cycles/", ""));
    return handleUpdateCycle(request, env, cycleId);
  }

  if (pathname.startsWith("/api/cycles/lookup/") && request.method === "GET") {
    const identifier = decodeURIComponent(pathname.replace("/api/cycles/lookup/", ""));
    return handleLookupCycle(request, env, identifier);
  }

  return null;
}
