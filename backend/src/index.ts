/**
 * Cloudflare Worker API for Bycme.
 */

export interface Env {
  DB: D1Database;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      if (pathname === "/api/health" && request.method === "GET") {
        return jsonResponse({
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: "staging",
        });
      }

      return jsonResponse({ error: "Not Found" }, 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      return jsonResponse({ error: message }, 500);
    }
  },
};
