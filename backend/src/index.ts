/**
 * Cloudflare Worker API for Bycme bike sharing.
 */

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Health check endpoint
      if (pathname === "/api/health" && request.method === "GET") {
        return jsonResponse({
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: "staging",
        });
      }

      // List stations
      if (pathname === "/api/stations" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id, name, latitude, longitude, total_docks as totalDocks, available_bikes as availableBikes FROM stations ORDER BY name"
        ).all();
        return jsonResponse(result.results);
      }

      // Get single station
      if (pathname.startsWith("/api/stations/") && request.method === "GET") {
        const id = pathname.replace("/api/stations/", "");
        const station = await env.DB.prepare(
          "SELECT id, name, latitude, longitude, total_docks as totalDocks, available_bikes as availableBikes FROM stations WHERE id = ?"
        ).bind(id).first();
        if (!station) {
          return jsonResponse({ error: "Station not found" }, 404);
        }
        return jsonResponse(station);
      }

      // List bikes
      if (pathname === "/api/bikes" && request.method === "GET") {
        const stationId = searchParams.get("stationId");
        let query = "SELECT id, station_id as stationId, bike_model as bikeModel, battery_level as batteryLevel, status FROM bikes";
        if (stationId) {
          query += " WHERE station_id = ?";
          const result = await env.DB.prepare(query).bind(stationId).all();
          return jsonResponse(result.results);
        }
        const result = await env.DB.prepare(query).all();
        return jsonResponse(result.results);
      }

      // Get single bike
      if (pathname.startsWith("/api/bikes/") && request.method === "GET") {
        const id = pathname.replace("/api/bikes/", "");
        const bike = await env.DB.prepare(
          "SELECT id, station_id as stationId, bike_model as bikeModel, battery_level as batteryLevel, status FROM bikes WHERE id = ?"
        ).bind(id).first();
        if (!bike) {
          return jsonResponse({ error: "Bike not found" }, 404);
        }
        return jsonResponse(bike);
      }

      // List active rides
      if (pathname === "/api/rides" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id, bike_id as bikeId, user_id as userId, start_station_id as startStationId, end_station_id as endStationId, start_time as startTime, end_time as endTime, status, cost FROM rides WHERE status = 'active'"
        ).all();
        return jsonResponse(result.results);
      }

      // Start ride
      if (pathname === "/api/rides" && request.method === "POST") {
        const body = (await request.json()) as { bikeId?: string; userId?: string };
        if (!body.bikeId || !body.userId) {
          return jsonResponse({ error: "bikeId and userId required" }, 400);
        }

        const bike = await env.DB.prepare("SELECT * FROM bikes WHERE id = ?").bind(body.bikeId).first<{ id: string; station_id: string; status: string }>();
        if (!bike) {
          return jsonResponse({ error: "Bike not found" }, 404);
        }
        if (bike.status !== "available") {
          return jsonResponse({ error: "Bike is not available" }, 409);
        }

        const rideId = `ride-${Date.now()}`;
        const startTime = new Date().toISOString();

        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO rides (id, bike_id, user_id, start_station_id, start_time, status) VALUES (?, ?, ?, ?, ?, 'active')"
          ).bind(rideId, body.bikeId, body.userId, bike.station_id, startTime),
          env.DB.prepare("UPDATE bikes SET status = 'in_use' WHERE id = ?").bind(body.bikeId),
          env.DB.prepare("UPDATE stations SET available_bikes = available_bikes - 1 WHERE id = ?").bind(bike.station_id),
        ]);

        return jsonResponse(
          {
            id: rideId,
            bikeId: body.bikeId,
            userId: body.userId,
            startStationId: bike.station_id,
            startTime,
            status: "active",
          },
          201
        );
      }

      // End ride
      if (pathname.match(/^\/api\/rides\/[^/]+\/end$/) && request.method === "POST") {
        const rideId = pathname.split("/")[3];
        const body = (await request.json()) as { endStationId?: string };
        if (!body.endStationId) {
          return jsonResponse({ error: "endStationId required" }, 400);
        }

        const ride = await env.DB.prepare("SELECT * FROM rides WHERE id = ? AND status = 'active'").bind(rideId).first<{ id: string; bike_id: string; start_time: string }>();
        if (!ride) {
          return jsonResponse({ error: "Active ride not found" }, 404);
        }

        const endTime = new Date().toISOString();
        const durationMinutes = Math.max(1, Math.round((new Date(endTime).getTime() - new Date(ride.start_time).getTime()) / 60000));
        const cost = Math.round((2.0 + durationMinutes * 0.15) * 100) / 100;

        await env.DB.batch([
          env.DB.prepare(
            "UPDATE rides SET end_station_id = ?, end_time = ?, status = 'completed', cost = ? WHERE id = ?"
          ).bind(body.endStationId, endTime, cost, rideId),
          env.DB.prepare("UPDATE bikes SET status = 'available', station_id = ? WHERE id = ?").bind(body.endStationId, ride.bike_id),
          env.DB.prepare("UPDATE stations SET available_bikes = available_bikes + 1 WHERE id = ?").bind(body.endStationId),
        ]);

        return jsonResponse({
          id: rideId,
          bikeId: ride.bike_id,
          endStationId: body.endStationId,
          endTime,
          status: "completed",
          cost,
        });
      }

      return jsonResponse({ error: "Not Found" }, 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      return jsonResponse({ error: message }, 500);
    }
  },
};
