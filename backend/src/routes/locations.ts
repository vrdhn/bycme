/**
 * Locations hierarchy endpoints (Cities, Buildings, Parkings).
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import { authenticateRequest } from "../middleware/auth";

/**
 * Endpoint: GET /api/cities
 * Auth: Bearer token
 * Description: List all configured cities.
 */
export async function handleListCities(
  request: Request,
  env: Env
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }

  const res = await env.DB.prepare(
    "SELECT id, name, state, created_at as createdAt FROM cities ORDER BY name"
  ).all();
  return jsonResponse(res.results || []);
}

/**
 * Endpoint: POST /api/cities
 * Auth: Bearer token (Admin only)
 * Description: Create a new city.
 */
export async function handleCreateCity(
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

/**
 * Endpoint: PUT /api/cities/{id}
 * Auth: Bearer token (Admin only)
 * Description: Update city name or state.
 */
export async function handleUpdateCity(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }
  if (!caller.roles.includes("Admin")) {
    return jsonResponse({ error: "Forbidden: Admin role required" }, 403);
  }

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

/**
 * Endpoint: GET /api/buildings
 * Auth: Bearer token
 * Description: List buildings with optional cityId filter.
 */
export async function handleListBuildings(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
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

/**
 * Endpoint: POST /api/buildings
 * Auth: Bearer token (Admin only)
 * Description: Create a new building under a city.
 */
export async function handleCreateBuilding(
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

/**
 * Endpoint: PUT /api/buildings/{id}
 * Auth: Bearer token (Admin only)
 * Description: Update building name, city, or classification.
 */
export async function handleUpdateBuilding(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
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

/**
 * Endpoint: GET /api/parkings
 * Auth: Bearer token
 * Description: List parking stands with optional buildingId filter.
 */
export async function handleListParkings(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
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

/**
 * Endpoint: POST /api/parkings
 * Auth: Bearer token (Admin only)
 * Description: Create a new parking stand under a building.
 */
export async function handleCreateParking(
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

/**
 * Endpoint: PUT /api/parkings/{id}
 * Auth: Bearer token (Admin only)
 * Description: Update parking stand name, building, or capacity.
 */
export async function handleUpdateParking(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
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

/**
 * Route dispatcher for location hierarchy endpoints.
 */
export async function handleLocationsRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  // Cities
  if (pathname === "/api/cities" && request.method === "GET") {
    return handleListCities(request, env);
  }
  if (pathname === "/api/cities" && request.method === "POST") {
    return handleCreateCity(request, env);
  }
  if (pathname.startsWith("/api/cities/") && request.method === "PUT") {
    const id = decodeURIComponent(pathname.replace("/api/cities/", ""));
    return handleUpdateCity(request, env, id);
  }

  // Buildings
  if (pathname === "/api/buildings" && request.method === "GET") {
    return handleListBuildings(request, env, url);
  }
  if (pathname === "/api/buildings" && request.method === "POST") {
    return handleCreateBuilding(request, env);
  }
  if (pathname.startsWith("/api/buildings/") && request.method === "PUT") {
    const id = decodeURIComponent(pathname.replace("/api/buildings/", ""));
    return handleUpdateBuilding(request, env, id);
  }

  // Parkings
  if (pathname === "/api/parkings" && request.method === "GET") {
    return handleListParkings(request, env, url);
  }
  if (pathname === "/api/parkings" && request.method === "POST") {
    return handleCreateParking(request, env);
  }
  if (pathname.startsWith("/api/parkings/") && request.method === "PUT") {
    const id = decodeURIComponent(pathname.replace("/api/parkings/", ""));
    return handleUpdateParking(request, env, id);
  }

  return null;
}
