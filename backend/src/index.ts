/**
 * Cloudflare Worker API for Bycme Cycle Sharing.
 */

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const currentUserId = request.headers.get("x-user-id") || "usr-admin";

    try {
      // 1. Health check
      if (pathname === "/api/health" && method === "GET") {
        return jsonResponse({
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: "staging",
        });
      }

      // 2. Persons List
      if (pathname === "/api/persons" && method === "GET") {
        const personsRes = await env.DB.prepare(
          "SELECT id, name, email, created_at as createdAt FROM persons ORDER BY name"
        ).all<{ id: string; name: string; email: string; createdAt: string }>();

        const rolesRes = await env.DB.prepare(
          "SELECT person_id, role FROM person_roles"
        ).all<{ person_id: string; role: string }>();

        const membershipsRes = await env.DB.prepare(
          "SELECT person_id, parking_id FROM parking_memberships WHERE status = 'approved'"
        ).all<{ person_id: string; parking_id: string }>();

        const rolesMap = new Map<string, string[]>();
        for (const r of rolesRes.results || []) {
          const list = rolesMap.get(r.person_id) || [];
          list.push(r.role);
          rolesMap.set(r.person_id, list);
        }

        const parkingsMap = new Map<string, string[]>();
        for (const m of membershipsRes.results || []) {
          const list = parkingsMap.get(m.person_id) || [];
          list.push(m.parking_id);
          parkingsMap.set(m.person_id, list);
        }

        const persons = (personsRes.results || []).map((p) => ({
          ...p,
          roles: rolesMap.get(p.id) || [],
          parkingIds: parkingsMap.get(p.id) || [],
        }));

        return jsonResponse(persons);
      }

      // 3. Update Person Roles
      if (pathname.match(/^\/api\/persons\/[^/]+\/roles$/) && method === "PUT") {
        const personId = pathname.split("/")[3];
        const body = (await request.json()) as { roles?: string[] };
        if (!body.roles || !Array.isArray(body.roles)) {
          return errorResponse("roles array is required");
        }

        await env.DB.prepare("DELETE FROM person_roles WHERE person_id = ?").bind(personId).run();
        for (const r of body.roles) {
          await env.DB.prepare("INSERT INTO person_roles (person_id, role) VALUES (?, ?)").bind(personId, r).run();
        }

        const p = await env.DB.prepare("SELECT id, name, email, created_at as createdAt FROM persons WHERE id = ?")
          .bind(personId)
          .first<{ id: string; name: string; email: string; createdAt: string }>();

        return jsonResponse({
          ...p,
          roles: body.roles,
          parkingIds: [],
        });
      }

      // 4. Buildings (list & create)
      if (pathname === "/api/buildings" && method === "GET") {
        const res = await env.DB.prepare(
          "SELECT id, name, building_type as buildingType, created_at as createdAt FROM buildings ORDER BY name"
        ).all();
        return jsonResponse(res.results || []);
      }

      if (pathname === "/api/buildings" && method === "POST") {
        const body = (await request.json()) as { name?: string; buildingType?: string };
        if (!body.name || !body.buildingType) {
          return errorResponse("name and buildingType are required");
        }
        const id = `bld-${Date.now()}`;
        const createdAt = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO buildings (id, name, building_type, created_at) VALUES (?, ?, ?, ?)"
        ).bind(id, body.name, body.buildingType, createdAt).run();

        return jsonResponse({ id, name: body.name, buildingType: body.buildingType, createdAt }, 201);
      }

      // 5. Parkings (list, create, update managers)
      if (pathname === "/api/parkings" && method === "GET") {
        const managerId = searchParams.get("managerId");
        let query = "SELECT id, building_id as buildingId, name, capacity, created_at as createdAt FROM parkings";
        let params: string[] = [];

        if (managerId) {
          query += " WHERE id IN (SELECT parking_id FROM parking_managers WHERE manager_id = ?)";
          params = [managerId];
        }

        query += " ORDER BY name";
        const parkingsRes = await env.DB.prepare(query).bind(...params).all<{
          id: string;
          buildingId: string;
          name: string;
          capacity: number;
          createdAt: string;
        }>();

        const managersRes = await env.DB.prepare("SELECT parking_id, manager_id FROM parking_managers").all<{
          parking_id: string;
          manager_id: string;
        }>();

        const managerMap = new Map<string, string[]>();
        for (const m of managersRes.results || []) {
          const list = managerMap.get(m.parking_id) || [];
          list.push(m.manager_id);
          managerMap.set(m.parking_id, list);
        }

        const parkings = (parkingsRes.results || []).map((pk) => ({
          ...pk,
          managerIds: managerMap.get(pk.id) || [],
        }));

        return jsonResponse(parkings);
      }

      if (pathname === "/api/parkings" && method === "POST") {
        const body = (await request.json()) as {
          buildingId?: string;
          name?: string;
          capacity?: number;
          managerIds?: string[];
        };
        if (!body.buildingId || !body.name || !body.capacity) {
          return errorResponse("buildingId, name, and capacity are required");
        }
        const id = `prk-${Date.now()}`;
        const createdAt = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO parkings (id, building_id, name, capacity, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, body.buildingId, body.name, body.capacity, createdAt).run();

        if (body.managerIds && Array.isArray(body.managerIds)) {
          for (const mid of body.managerIds) {
            await env.DB.prepare(
              "INSERT INTO parking_managers (parking_id, manager_id) VALUES (?, ?)"
            ).bind(id, mid).run();
          }
        }

        return jsonResponse(
          {
            id,
            buildingId: body.buildingId,
            name: body.name,
            capacity: body.capacity,
            managerIds: body.managerIds || [],
            createdAt,
          },
          201
        );
      }

      if (pathname.match(/^\/api\/parkings\/[^/]+\/managers$/) && method === "PUT") {
        const parkingId = pathname.split("/")[3];
        const body = (await request.json()) as { managerIds?: string[] };
        if (!body.managerIds || !Array.isArray(body.managerIds)) {
          return errorResponse("managerIds array is required");
        }

        await env.DB.prepare("DELETE FROM parking_managers WHERE parking_id = ?").bind(parkingId).run();
        for (const mid of body.managerIds) {
          await env.DB.prepare("INSERT INTO parking_managers (parking_id, manager_id) VALUES (?, ?)").bind(parkingId, mid).run();
        }

        const pk = await env.DB.prepare(
          "SELECT id, building_id as buildingId, name, capacity, created_at as createdAt FROM parkings WHERE id = ?"
        ).bind(parkingId).first();

        return jsonResponse({
          ...pk,
          managerIds: body.managerIds,
        });
      }

      // 6. Cycles (list, create, update condition, trails)
      if (pathname === "/api/cycles" && method === "GET") {
        const parkingId = searchParams.get("parkingId");
        let query = "SELECT id, public_cycle_id as publicCycleId, parking_id as parkingId, make_model as makeModel, qr_code as qrCode, condition, created_at as createdAt FROM cycles";
        const params: string[] = [];
        if (parkingId) {
          query += " WHERE parking_id = ?";
          params.push(parkingId);
        }
        query += " ORDER BY public_cycle_id";
        const res = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse(res.results || []);
      }

      if (pathname === "/api/cycles" && method === "POST") {
        const body = (await request.json()) as {
          parkingId?: string;
          publicCycleId?: string;
          makeModel?: string;
        };
        if (!body.parkingId || !body.publicCycleId || !body.makeModel) {
          return errorResponse("parkingId, publicCycleId, and makeModel are required");
        }
        const id = `cyc-${Date.now()}`;
        const qrCode = `BYCME:${body.publicCycleId.toUpperCase()}`;
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          "INSERT INTO cycles (id, public_cycle_id, parking_id, make_model, qr_code, condition, created_at) VALUES (?, ?, ?, ?, ?, 'Working', ?)"
        ).bind(id, body.publicCycleId, body.parkingId, body.makeModel, qrCode, createdAt).run();

        return jsonResponse(
          {
            id,
            publicCycleId: body.publicCycleId,
            parkingId: body.parkingId,
            makeModel: body.makeModel,
            qrCode,
            condition: "Working",
            createdAt,
          },
          201
        );
      }

      if (pathname.match(/^\/api\/cycles\/[^/]+\/condition$/) && method === "PUT") {
        const cycleId = pathname.split("/")[3];
        const body = (await request.json()) as { condition?: string; notes?: string };
        if (!body.condition) {
          return errorResponse("condition is required");
        }

        const existing = await env.DB.prepare("SELECT condition FROM cycles WHERE id = ?").bind(cycleId).first<{ condition: string }>();
        if (!existing) {
          return errorResponse("Cycle not found", 404);
        }

        const fromCondition = existing.condition;
        const toCondition = body.condition;
        const notes = body.notes || "";
        const trailId = `trl-${Date.now()}`;

        await env.DB.batch([
          env.DB.prepare("UPDATE cycles SET condition = ? WHERE id = ?").bind(toCondition, cycleId),
          env.DB.prepare(
            "INSERT INTO cycle_condition_trails (id, cycle_id, person_id, from_condition, to_condition, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).bind(trailId, cycleId, currentUserId, fromCondition, toCondition, notes, new Date().toISOString()),
        ]);

        const updated = await env.DB.prepare(
          "SELECT id, public_cycle_id as publicCycleId, parking_id as parkingId, make_model as makeModel, qr_code as qrCode, condition, created_at as createdAt FROM cycles WHERE id = ?"
        ).bind(cycleId).first();

        return jsonResponse(updated);
      }

      if (pathname.match(/^\/api\/cycles\/[^/]+\/trails$/) && method === "GET") {
        const cycleId = pathname.split("/")[3];
        const res = await env.DB.prepare(
          "SELECT id, cycle_id as cycleId, person_id as personId, from_condition as fromCondition, to_condition as toCondition, notes, created_at as createdAt FROM cycle_condition_trails WHERE cycle_id = ? ORDER BY created_at DESC"
        ).bind(cycleId).all();
        return jsonResponse(res.results || []);
      }

      // 7. Rides (list, checkout, checkin)
      if (pathname === "/api/rides" && method === "GET") {
        const parkingId = searchParams.get("parkingId");
        const riderId = searchParams.get("riderId");
        const status = searchParams.get("status");

        let query = "SELECT id, cycle_id as cycleId, rider_id as riderId, parking_id as parkingId, status, start_time as startTime, end_time as endTime, checkout_notes as checkoutNotes, checkin_notes as checkinNotes, created_at as createdAt FROM rides WHERE 1=1";
        const params: string[] = [];

        if (parkingId) {
          query += " AND parking_id = ?";
          params.push(parkingId);
        }
        if (riderId) {
          query += " AND rider_id = ?";
          params.push(riderId);
        }
        if (status) {
          query += " AND status = ?";
          params.push(status);
        }
        query += " ORDER BY start_time DESC";

        const res = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse(res.results || []);
      }

      if (pathname === "/api/rides/checkout" && method === "POST") {
        const body = (await request.json()) as { cycleId?: string; checkoutNotes?: string };
        if (!body.cycleId) {
          return errorResponse("cycleId is required");
        }

        // Rule: Only 1 active ride per rider at a time
        const activeRide = await env.DB.prepare(
          "SELECT id FROM rides WHERE rider_id = ? AND status = 'active'"
        ).bind(currentUserId).first();

        if (activeRide) {
          return errorResponse("Rider already has an active ride. Only 1 active ride is allowed at a time.", 409);
        }

        const cycle = await env.DB.prepare(
          "SELECT id, parking_id as parkingId, condition FROM cycles WHERE id = ?"
        ).bind(body.cycleId).first<{ id: string; parkingId: string; condition: string }>();

        if (!cycle) {
          return errorResponse("Cycle not found", 404);
        }

        if (cycle.condition !== "Working") {
          return errorResponse(`Cannot checkout cycle in '${cycle.condition}' condition.`, 409);
        }

        // Check if cycle is currently ridden by someone else
        const cycleActiveRide = await env.DB.prepare(
          "SELECT id FROM rides WHERE cycle_id = ? AND status = 'active'"
        ).bind(body.cycleId).first();

        if (cycleActiveRide) {
          return errorResponse("Cycle is currently in use by another rider.", 409);
        }

        const rideId = `rd-${Date.now()}`;
        const startTime = new Date().toISOString();
        const checkoutNotes = body.checkoutNotes || "";

        await env.DB.prepare(
          "INSERT INTO rides (id, cycle_id, rider_id, parking_id, status, start_time, checkout_notes, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)"
        ).bind(rideId, cycle.id, currentUserId, cycle.parkingId, startTime, checkoutNotes, startTime).run();

        return jsonResponse(
          {
            id: rideId,
            cycleId: cycle.id,
            riderId: currentUserId,
            parkingId: cycle.parkingId,
            status: "active",
            startTime,
            checkoutNotes,
            checkinNotes: "",
            createdAt: startTime,
          },
          201
        );
      }

      if (pathname.match(/^\/api\/rides\/[^/]+\/checkin$/) && method === "POST") {
        const rideId = pathname.split("/")[3];
        const body = (await request.json()) as { checkinNotes?: string; conditionChange?: string };

        const ride = await env.DB.prepare(
          "SELECT id, cycle_id as cycleId, rider_id as riderId, status FROM rides WHERE id = ?"
        ).bind(rideId).first<{ id: string; cycleId: string; riderId: string; status: string }>();

        if (!ride) {
          return errorResponse("Ride not found", 404);
        }
        if (ride.status !== "active") {
          return errorResponse("Ride is already finished", 400);
        }

        const endTime = new Date().toISOString();
        const checkinNotes = body.checkinNotes || "";

        await env.DB.prepare(
          "UPDATE rides SET status = 'finished', end_time = ?, checkin_notes = ? WHERE id = ?"
        ).bind(endTime, checkinNotes, rideId).run();

        // If condition changed, update cycle and write trail
        if (body.conditionChange) {
          const cycle = await env.DB.prepare("SELECT condition FROM cycles WHERE id = ?").bind(ride.cycleId).first<{ condition: string }>();
          if (cycle && cycle.condition !== body.conditionChange) {
            await env.DB.batch([
              env.DB.prepare("UPDATE cycles SET condition = ? WHERE id = ?").bind(body.conditionChange, ride.cycleId),
              env.DB.prepare(
                "INSERT INTO cycle_condition_trails (id, cycle_id, person_id, from_condition, to_condition, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
              ).bind(`trl-${Date.now()}`, ride.cycleId, currentUserId, cycle.condition, body.conditionChange, checkinNotes, endTime),
            ]);
          }
        }

        const updatedRide = await env.DB.prepare(
          "SELECT id, cycle_id as cycleId, rider_id as riderId, parking_id as parkingId, status, start_time as startTime, end_time as endTime, checkout_notes as checkoutNotes, checkin_notes as checkinNotes, created_at as createdAt FROM rides WHERE id = ?"
        ).bind(rideId).first();

        return jsonResponse(updatedRide);
      }

      // 8. Invitations (create & accept)
      if (pathname === "/api/invitations" && method === "POST") {
        const body = (await request.json()) as { parkingId?: string };
        if (!body.parkingId) {
          return errorResponse("parkingId is required");
        }

        const randomCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const id = `inv-${Date.now()}`;
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          "INSERT INTO invitations (id, code, parking_id, created_by, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)"
        ).bind(id, randomCode, body.parkingId, currentUserId, createdAt).run();

        return jsonResponse({
          id,
          code: randomCode,
          parkingId: body.parkingId,
          createdBy: currentUserId,
          status: "active",
          createdAt,
        }, 201);
      }

      if (pathname === "/api/invitations/accept" && method === "POST") {
        const body = (await request.json()) as {
          code?: string;
          name?: string;
          email?: string;
          password?: string;
        };

        if (!body.code || !body.name || !body.email || !body.password) {
          return errorResponse("code, name, email, and password are required");
        }

        const invitation = await env.DB.prepare(
          "SELECT id, parking_id as parkingId, status FROM invitations WHERE code = ?"
        ).bind(body.code.trim().toUpperCase()).first<{ id: string; parkingId: string; status: string }>();

        if (!invitation || invitation.status !== "active") {
          return errorResponse("Invalid or inactive invitation code", 400);
        }

        // Find or create person
        let person = await env.DB.prepare("SELECT id, name, email FROM persons WHERE email = ?").bind(body.email.trim()).first<{ id: string; name: string; email: string }>();

        if (!person) {
          const personId = `usr-${Date.now()}`;
          const createdAt = new Date().toISOString();
          await env.DB.prepare(
            "INSERT INTO persons (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
          ).bind(personId, body.name.trim(), body.email.trim(), body.password, createdAt).run();

          // Add Rider role
          await env.DB.prepare("INSERT INTO person_roles (person_id, role) VALUES (?, 'Rider')").bind(personId).run();
          person = { id: personId, name: body.name.trim(), email: body.email.trim() };
        } else {
          // Ensure rider role
          await env.DB.prepare("INSERT OR IGNORE INTO person_roles (person_id, role) VALUES (?, 'Rider')").bind(person.id).run();
        }

        // Create membership request
        const membershipId = `pm-${Date.now()}`;
        const createdAt = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO parking_memberships (id, parking_id, person_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
        ).bind(membershipId, invitation.parkingId, person.id, createdAt).run();

        return jsonResponse({
          id: membershipId,
          parkingId: invitation.parkingId,
          personId: person.id,
          status: "pending",
          personName: person.name,
          personEmail: person.email,
          createdAt,
        }, 201);
      }

      // 9. Memberships (list & update status)
      if (pathname === "/api/memberships" && method === "GET") {
        const parkingId = searchParams.get("parkingId");
        let query = `
          SELECT m.id, m.parking_id as parkingId, m.person_id as personId, m.status, m.created_at as createdAt,
                 p.name as personName, p.email as personEmail, pk.name as parkingName
          FROM parking_memberships m
          JOIN persons p ON m.person_id = p.id
          JOIN parkings pk ON m.parking_id = pk.id
        `;
        const params: string[] = [];
        if (parkingId) {
          query += " WHERE m.parking_id = ?";
          params.push(parkingId);
        }
        query += " ORDER BY m.created_at DESC";

        const res = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse(res.results || []);
      }

      if (pathname.match(/^\/api\/memberships\/[^/]+$/) && method === "PUT") {
        const membershipId = pathname.split("/")[3];
        const body = (await request.json()) as { status?: string };
        if (!body.status || !["approved", "disapproved", "pending"].includes(body.status)) {
          return errorResponse("status must be 'approved', 'disapproved', or 'pending'");
        }

        await env.DB.prepare(
          "UPDATE parking_memberships SET status = ? WHERE id = ?"
        ).bind(body.status, membershipId).run();

        const updated = await env.DB.prepare(`
          SELECT m.id, m.parking_id as parkingId, m.person_id as personId, m.status, m.created_at as createdAt,
                 p.name as personName, p.email as personEmail, pk.name as parkingName
          FROM parking_memberships m
          JOIN persons p ON m.person_id = p.id
          JOIN parkings pk ON m.parking_id = pk.id
          WHERE m.id = ?
        `).bind(membershipId).first();

        return jsonResponse(updated);
      }

      return errorResponse("Not Found", 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      return errorResponse(message, 500);
    }
  },
};
