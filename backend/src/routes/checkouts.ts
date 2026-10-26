/**
 * Rider cycle checkout sessions and return endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import { formatCycle, formatCycleCheckout } from "../utils/formatters";
import { authenticateRequest } from "../middleware/auth";

/**
 * Endpoint: GET /api/me/active-checkout
 * Auth: Bearer token
 * Description: Return caller's currently active cycle checkout session.
 */
export async function handleGetActiveCheckout(
  request: Request,
  env: Env
): Promise<Response> {
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

/**
 * Endpoint: GET /api/me/home-parking
 * Auth: Bearer token (Rider only)
 * Description: Return rider's designated home parking stand details and fleet inventory.
 */
export async function handleGetHomeParking(
  request: Request,
  env: Env
): Promise<Response> {
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

/**
 * Endpoint: POST /api/cycles/{id}/checkout
 * Auth: Bearer token (Rider only)
 * Description: Checkout bicycle at rider's home stand and reveal mechanical combination code.
 */
export async function handleCheckoutCycle(
  request: Request,
  env: Env,
  cycleId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Rider")) {
    return jsonResponse({ error: "Forbidden: Rider role required" }, 403);
  }

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
  try {
    await env.DB.prepare(
      "INSERT INTO cycle_checkouts (id, cycle_id, person_id, parking_id, status) VALUES (?, ?, ?, ?, 'active')"
    )
      .bind(checkoutId, cycleId, caller.id, cycle.parking_id)
      .run();
  } catch (err: any) {
    const errMsg = String(err?.message || "");
    if (errMsg.includes("cycle_checkouts.cycle_id") || errMsg.includes("idx_cycle_checkouts_active_cycle")) {
      return jsonResponse(
        { error: "This cycle is currently in use by another rider." },
        409
      );
    }
    if (errMsg.includes("cycle_checkouts.person_id") || errMsg.includes("idx_cycle_checkouts_active_person")) {
      return jsonResponse(
        { error: "You already have an active cycle checkout. Return your active cycle before checking out another." },
        400
      );
    }
    if (errMsg.includes("UNIQUE constraint failed") || errMsg.includes("constraint")) {
      return jsonResponse(
        { error: "This cycle is currently in use by another rider." },
        409
      );
    }
    throw err;
  }

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

/**
 * Endpoint: POST /api/checkouts/{id}/return
 * Auth: Bearer token
 * Description: Check-in / return cycle back to stand with damage condition reporting.
 */
export async function handleReturnCycle(
  request: Request,
  env: Env,
  checkoutId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }

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

  const updateRes = await env.DB.prepare(
    "UPDATE cycle_checkouts SET status = 'returned', returned_at = datetime('now'), return_condition = ?, return_notes = ? WHERE id = ? AND status = 'active'"
  )
    .bind(condition, notes, checkoutId)
    .run();

  const changes = updateRes.meta?.changes ?? (updateRes as any).changes ?? 0;
  if (changes < 1) {
    return jsonResponse({ error: "This cycle checkout is already marked returned" }, 400);
  }

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

/**
 * Route dispatcher for active checkout, home parking, and return endpoints.
 */
export async function handleCheckoutsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  if (pathname === "/api/me/active-checkout" && request.method === "GET") {
    return handleGetActiveCheckout(request, env);
  }

  if (pathname === "/api/me/home-parking" && request.method === "GET") {
    return handleGetHomeParking(request, env);
  }

  if (
    pathname.startsWith("/api/cycles/") &&
    pathname.endsWith("/checkout") &&
    request.method === "POST"
  ) {
    const cycleId = decodeURIComponent(
      pathname.replace("/api/cycles/", "").replace("/checkout", "")
    );
    return handleCheckoutCycle(request, env, cycleId);
  }

  if (
    pathname.startsWith("/api/checkouts/") &&
    pathname.endsWith("/return") &&
    request.method === "POST"
  ) {
    const checkoutId = decodeURIComponent(
      pathname.replace("/api/checkouts/", "").replace("/return", "")
    );
    return handleReturnCycle(request, env, checkoutId);
  }

  return null;
}
