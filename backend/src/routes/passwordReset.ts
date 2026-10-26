/**
 * Password reset management and public token execution endpoints.
 */

import { Env } from "../types";
import { jsonResponse } from "../utils/response";
import {
  generateCompactToken,
  hashPassword,
} from "../utils/crypto";
import { authenticateRequest } from "../middleware/auth";

/**
 * Format WhatsApp URL with recipient mobile phone number if present.
 */
function buildWhatsAppUrl(mobile: string | null | undefined, message: string): string {
  if (!mobile) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  let digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits.length > 0
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Endpoint: POST /api/persons/{id}/password-reset
 * Auth: Bearer token (Admin or Manager with hub jurisdiction)
 * Description: Generate a single-use time-limited password reset link and WhatsApp sharing URL.
 */
export async function handleCreatePasswordReset(
  request: Request,
  env: Env,
  personId: string
): Promise<Response> {
  const caller = await authenticateRequest(request, env);
  if (!caller) {
    return jsonResponse({ error: "Missing or invalid authorization token" }, 401);
  }

  const callerRoles = caller.roles;
  const isAdmin = callerRoles.includes("Admin");
  const isManager = callerRoles.includes("Manager");

  if (!isAdmin && !isManager) {
    return jsonResponse(
      { error: "Forbidden: only Admin or Manager can generate password reset links" },
      403
    );
  }

  // Manager jurisdiction check
  if (!isAdmin && isManager) {
    const managerParkings = await env.DB.prepare(
      "SELECT parking_id FROM parking_managers WHERE person_id = ?"
    )
      .bind(caller.id)
      .all<{ parking_id: string }>();

    const parkingIds = (managerParkings.results || []).map((r) => r.parking_id);
    if (parkingIds.length === 0) {
      return jsonResponse(
        { error: "Forbidden: manager has no assigned parking hubs" },
        403
      );
    }

    const placeholders = parkingIds.map(() => "?").join(", ");
    const bindingCheck = await env.DB.prepare(
      `SELECT 1 FROM parking_riders WHERE person_id = ? AND parking_id IN (${placeholders})
       UNION
       SELECT 1 FROM parking_managers WHERE person_id = ? AND parking_id IN (${placeholders})`
    )
      .bind(personId, ...parkingIds, personId, ...parkingIds)
      .first();

    if (!bindingCheck) {
      return jsonResponse(
        { error: "Forbidden: manager cannot reset password for a person outside their managed parking hubs" },
        403
      );
    }
  }

  // Target person lookup
  const targetPerson = await env.DB.prepare(
    "SELECT id, email, name, mobile FROM persons WHERE id = ?"
  )
    .bind(personId)
    .first<{ id: string; email: string; name: string; mobile: string | null }>();

  if (!targetPerson) {
    return jsonResponse({ error: "Person not found" }, 404);
  }

  // Invalidate any previous unused reset tokens for this user
  await env.DB.prepare(
    "UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE person_id = ? AND used_at IS NULL"
  )
    .bind(personId)
    .run();

  const resetId = `pwr-${crypto.randomUUID().slice(0, 8)}`;
  const token = generateCompactToken();

  await env.DB.prepare(
    `INSERT INTO password_resets (id, person_id, token, created_by, expires_at)
     VALUES (?, ?, ?, ?, datetime('now', '+24 hours'))`
  )
    .bind(resetId, personId, token, caller.id)
    .run();

  const resetRecord = await env.DB.prepare(
    "SELECT id, expires_at FROM password_resets WHERE id = ?"
  )
    .bind(resetId)
    .first<{ id: string; expires_at: string }>();

  const expiresAt = resetRecord ? resetRecord.expires_at : new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const frontendBase = env.FRONTEND_URL || "https://bycme-staging.pages.dev";
  const resetUrl = `${frontendBase}/#/reset-password/${token}`;

  const whatsappMessage =
    `Hi ${targetPerson.name}, here is your Bycme password reset link:\n` +
    `${resetUrl}\n\n` +
    `Note: This single-use link expires in 24 hours.`;

  const whatsappUrl = buildWhatsAppUrl(targetPerson.mobile, whatsappMessage);

  return jsonResponse({
    id: resetId,
    token,
    resetUrl,
    whatsappUrl,
    whatsappMessage,
    expiresAt,
    personName: targetPerson.name,
    personEmail: targetPerson.email,
    personMobile: targetPerson.mobile || undefined,
  });
}

/**
 * Endpoint: GET /api/auth/reset-password/{token}
 * Auth: None (Public)
 * Description: Validate reset token and retrieve target user display information.
 */
export async function handleGetPasswordResetTokenInfo(
  request: Request,
  env: Env,
  token: string
): Promise<Response> {
  const row = await env.DB.prepare(
    `SELECT pr.id, pr.person_id, pr.expires_at, pr.used_at, p.name AS person_name, p.email AS person_email
     FROM password_resets pr
     INNER JOIN persons p ON p.id = pr.person_id
     WHERE pr.token = ?`
  )
    .bind(token)
    .first<{
      id: string;
      person_id: string;
      expires_at: string;
      used_at: string | null;
      person_name: string;
      person_email: string;
    }>();

  if (!row) {
    return jsonResponse({ error: "Invalid or expired reset token" }, 404);
  }

  const isExpired = new Date(row.expires_at.replace(" ", "T") + "Z").getTime() <= Date.now();
  if (row.used_at || isExpired) {
    return jsonResponse({ error: "Invalid or expired reset token" }, 400);
  }

  return jsonResponse({
    valid: true,
    personName: row.person_name,
    personEmail: row.person_email,
    expiresAt: row.expires_at,
  });
}

/**
 * Endpoint: POST /api/auth/reset-password
 * Auth: None (Public)
 * Description: Consume valid token and update user password credentials.
 */
export async function handleExecutePasswordReset(
  request: Request,
  env: Env
): Promise<Response> {
  const body = (await request.json()) as { token?: string; password?: string };

  if (!body.token || !body.password) {
    return jsonResponse({ error: "Token and password required" }, 400);
  }

  if (body.password.length < 6) {
    return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
  }

  const row = await env.DB.prepare(
    "SELECT id, person_id, expires_at, used_at FROM password_resets WHERE token = ?"
  )
    .bind(body.token.trim())
    .first<{
      id: string;
      person_id: string;
      expires_at: string;
      used_at: string | null;
    }>();

  if (!row) {
    return jsonResponse({ error: "Invalid or expired reset token" }, 404);
  }

  const isExpired = new Date(row.expires_at.replace(" ", "T") + "Z").getTime() <= Date.now();
  if (row.used_at || isExpired) {
    return jsonResponse({ error: "Invalid or expired reset token" }, 400);
  }

  const { hashHex, saltHex } = await hashPassword(body.password);

  await env.DB.prepare(
    "UPDATE persons SET password_hash = ?, password_salt = ? WHERE id = ?"
  )
    .bind(hashHex, saltHex, row.person_id)
    .run();

  await env.DB.prepare(
    "UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(row.id)
    .run();

  return jsonResponse({
    success: true,
    message: "Password updated successfully",
  });
}

/**
 * Route dispatcher for password reset endpoints.
 */
export async function handlePasswordResetRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const { pathname } = url;

  // POST /api/persons/:id/password-reset
  const personResetMatch = pathname.match(/^\/api\/persons\/([^/]+)\/password-reset$/);
  if (personResetMatch && request.method === "POST") {
    return handleCreatePasswordReset(request, env, personResetMatch[1]);
  }

  // GET /api/auth/reset-password/:token
  const tokenInfoMatch = pathname.match(/^\/api\/auth\/reset-password\/([^/]+)$/);
  if (tokenInfoMatch && request.method === "GET") {
    return handleGetPasswordResetTokenInfo(request, env, tokenInfoMatch[1]);
  }

  // POST /api/auth/reset-password
  if (pathname === "/api/auth/reset-password" && request.method === "POST") {
    return handleExecutePasswordReset(request, env);
  }

  return null;
}
