/**
 * BYCME Backend Cloudflare Worker Entry Point
 * Dispatches incoming HTTP requests to modular route handlers.
 */

import { Env } from "./types";
import { CORS_HEADERS, jsonResponse } from "./utils/response";
import { handleHealthRoutes } from "./routes/health";
import { handleAuthRoutes } from "./routes/auth";
import { handleLocationsRoutes } from "./routes/locations";
import { handleInvitationsRoutes } from "./routes/invitations";
import { handleManagerRequestsRoutes } from "./routes/managerRequests";
import { handleManagerParkingsRoutes } from "./routes/managerParkings";
import { handleCyclesRoutes } from "./routes/cycles";
import { handleCheckoutsRoutes } from "./routes/checkouts";

export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS, status: 204 });
    }

    try {
      const url = new URL(request.url);

      // 1. Health routes
      const healthRes = await handleHealthRoutes(request, env, url);
      if (healthRes) return healthRes;

      // 2. Auth & Person directory routes
      const authRes = await handleAuthRoutes(request, env, url);
      if (authRes) return authRes;

      // 3. Location routes (Cities, Buildings, Parkings)
      const locRes = await handleLocationsRoutes(request, env, url);
      if (locRes) return locRes;

      // 4. Invitation routes (Manager/Rider invites, public claim, admin review)
      const invRes = await handleInvitationsRoutes(request, env, url);
      if (invRes) return invRes;

      // 5. Manager request routes (User requests, Admin approval/rejection)
      const mgrReqRes = await handleManagerRequestsRoutes(request, env, url);
      if (mgrReqRes) return mgrReqRes;

      // 6. Manager parking operations (Managed parkings, rider requests, active riders)
      const mgrParkRes = await handleManagerParkingsRoutes(request, env, url);
      if (mgrParkRes) return mgrParkRes;

      // 7. Cycle fleet management (List, Create, Update, Public/QR lookup)
      const cycRes = await handleCyclesRoutes(request, env, url);
      if (cycRes) return cycRes;

      // 8. Checkout operations (Active checkout, Home parking, Checkout, Return)
      const chkRes = await handleCheckoutsRoutes(request, env, url);
      if (chkRes) return chkRes;

      return jsonResponse({ error: "Not Found" }, 404);
    } catch (error) {
      return jsonResponse(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  },
};
