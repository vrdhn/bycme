import { useState, useEffect } from "react";
import { BycmeClient, PasswordResetResponse } from "../../../generated/shared";

interface PasswordResetModalProps {
  apiClient: BycmeClient;
  personId: string;
  personName: string;
  personEmail: string;
  personMobile?: string;
  token: string;
  onClose: () => void;
}

export function PasswordResetModal({
  apiClient,
  personId,
  personName,
  personEmail,
  personMobile,
  token,
  onClose,
}: PasswordResetModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetData, setResetData] = useState<PasswordResetResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    apiClient
      .createPasswordReset(personId, token)
      .then((res) => {
        if (active) {
          setResetData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to generate password reset link");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [apiClient, personId, token]);

  const handleCopyLink = async () => {
    if (!resetData?.resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetData.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "540px",
          background: "var(--card-bg, #ffffff)",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-main)" }}>
            🔑 Password Reset Link
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: "1.25rem", padding: "0.75rem", background: "var(--card-bg-subtle, #f8fafc)", borderRadius: "0.375rem" }}>
          <div style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "0.25rem" }}>
            {personName}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            ✉️ {personEmail}
          </div>
          {personMobile && (
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              📱 {personMobile}
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", margin: "2rem 0" }}>
            Generating secure reset link...
          </p>
        ) : error ? (
          <div style={{ padding: "0.75rem", background: "#fef2f2", color: "#b91c1c", borderRadius: "0.375rem", marginBottom: "1rem" }}>
            ⚠️ {error}
          </div>
        ) : resetData ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-main)" }}>
                Reset URL (Single-Use, Expires in 24 Hours)
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={resetData.resetUrl}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--border-color)",
                    background: "var(--card-bg-subtle)",
                    fontSize: "0.85rem",
                    color: "var(--text-main)",
                  }}
                />
                <button
                  type="button"
                  className={copied ? "btn-success" : "btn-primary"}
                  onClick={handleCopyLink}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-main)" }}>
                WhatsApp Direct Link
              </label>
              <a
                href={resetData.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  textDecoration: "none",
                  padding: "0.6rem 1rem",
                  background: "#25D366",
                  color: "#ffffff",
                  borderRadius: "0.375rem",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                }}
              >
                💬 Open WhatsApp ({personMobile || "Direct Message"})
              </a>
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "var(--card-bg-subtle)", padding: "0.6rem 0.8rem", borderRadius: "0.25rem" }}>
              ℹ️ Share this link with the user. The link expires 24 hours after generation and can only be used once.
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
