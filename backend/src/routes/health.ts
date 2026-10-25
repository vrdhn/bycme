/**
 * Health check endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";

/**
 * Endpoint: GET /api/health
 * Auth: None
 * Description: Heartbeat check returning service health and timestamp.
 */
export async function handleGetHealth(): Promise<Response> {
  return jsonResponse({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: "staging",
  });
}

/**
 * Route dispatcher for health endpoints.
 */
export async function handleHealthRoutes(
  request: Request,
  _env: Env,
  url: URL
): Promise<Response | null> {
  if (url.pathname === "/api/health" && request.method === "GET") {
    return handleGetHealth();
  }
  return null;
}
