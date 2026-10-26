import React, { useState, useEffect } from "react";
import { BycmeClient, PasswordResetTokenInfo } from "../../../generated/shared";

interface ResetPasswordLandingProps {
  apiClient: BycmeClient;
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResetPasswordLanding({
  apiClient,
  token,
  onSuccess,
  onCancel,
}: ResetPasswordLandingProps) {
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<PasswordResetTokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiClient
      .getPasswordResetTokenInfo(token)
      .then((info) => {
        if (active) {
          setTokenInfo(info);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "This password reset link is invalid, expired, or has already been used."
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [apiClient, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.executePasswordReset({
        token,
        password,
      });
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "2rem",
          background: "var(--card-bg, #ffffff)",
          borderRadius: "0.5rem",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
            🔑 Reset Password
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Bycme Cycle Platform
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", margin: "2rem 0" }}>
            Verifying reset link...
          </p>
        ) : error ? (
          <div>
            <div
              style={{
                padding: "1rem",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: "0.375rem",
                marginBottom: "1.5rem",
                fontSize: "0.9rem",
              }}
            >
              <strong>⚠️ Link Expired or Invalid</strong>
              <p style={{ margin: "0.5rem 0 0 0" }}>{error}</p>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Please request a new reset link from your Club administrator or Hub manager.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={onCancel}
            >
              ← Back to Home
            </button>
          </div>
        ) : isSuccess ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
              Password Changed!
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Your password has been successfully updated. You may now sign in using your new credentials.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={onSuccess}
            >
              Proceed to Login ➔
            </button>
          </div>
        ) : tokenInfo ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.75rem",
                background: "var(--card-bg-subtle, #f8fafc)",
                borderRadius: "0.375rem",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                {tokenInfo.personName}
              </div>
              <div style={{ color: "var(--text-muted)" }}>{tokenInfo.personEmail}</div>
            </div>

            {submitError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderRadius: "0.375rem",
                  fontSize: "0.85rem",
                }}
              >
                ⚠️ {submitError}
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.3rem",
                  color: "var(--text-main)",
                }}
              >
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--border-color)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  marginBottom: "0.3rem",
                  color: "var(--text-main)",
                }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--border-color)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={submitting}
              >
                {submitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
