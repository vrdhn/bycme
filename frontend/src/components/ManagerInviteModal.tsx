import { useState, useEffect, useCallback } from "react";
import {
  BycmeClient,
  Parking,
  ManagerInvitation,
} from "../../../generated/shared";

interface ManagerInviteModalProps {
  apiClient: BycmeClient;
  parking: Parking;
  token: string;
  onClose: () => void;
}

export function ManagerInviteModal({
  apiClient,
  parking,
  token,
  onClose,
}: ManagerInviteModalProps) {
  const [durationHours, setDurationHours] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeInvitations, setActiveInvitations] = useState<ManagerInvitation[]>([]);
  const [latestInvite, setLatestInvite] = useState<ManagerInvitation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    try {
      const list = await apiClient.listManagerInvitations(parking.id, token);
      setActiveInvitations(list);
    } catch {
      // ignore
    }
  }, [apiClient, parking.id, token]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const invite = await apiClient.createManagerInvitation(
        parking.id,
        { durationHours },
        token
      );
      setLatestInvite(invite);
      setSuccessMsg("Manager invitation generated successfully.");
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
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
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "560px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>
              🔑 Invite Parking Manager
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {parking.name} ({parking.buildingName || "Building"}
              {parking.cityName ? `, ${parking.cityName}` : ""})
            </p>
          </div>
          <button className="btn-text" onClick={onClose} style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}>
            ✕
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {successMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleGenerate} style={{ marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label">Link Expiry Duration</label>
            <select
              className="form-input"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
            >
              <option value={1}>1 Hour (Quick Invite)</option>
              <option value={6}>6 Hours</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours (Default)</option>
              <option value={72}>3 Days (72 Hours)</option>
              <option value={168}>7 Days (168 Hours)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Generating Link..." : "Generate Manager Invite ➔"}
          </button>
        </form>

        {latestInvite && (
          <div
            style={{
              background: "var(--highlight-box)",
              border: "1px solid var(--border-color)",
              borderRadius: "0.75rem",
              padding: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary-color)" }}>
                READY TO SHARE
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Expires {new Date(latestInvite.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div
              style={{
                fontFamily: "monospace",
                fontSize: "0.8rem",
                background: "var(--card-bg)",
                padding: "0.6rem",
                borderRadius: "0.375rem",
                border: "1px solid var(--border-color)",
                wordBreak: "break-all",
                marginBottom: "0.75rem",
              }}
            >
              {latestInvite.inviteUrl}
            </div>

            <label className="form-label" style={{ fontSize: "0.8rem" }}>
              WhatsApp Formatted Message:
            </label>
            <textarea
              readOnly
              className="form-input"
              rows={4}
              value={latestInvite.whatsappMessage}
              style={{ fontSize: "0.85rem", resize: "none", marginBottom: "0.75rem" }}
            />

            <button
              type="button"
              className="btn-primary"
              style={{ background: copiedId === latestInvite.id ? "#15803d" : "#25d366" }}
              onClick={() => handleCopy(latestInvite.whatsappMessage, latestInvite.id)}
            >
              {copiedId === latestInvite.id ? "✓ Copied to Clipboard!" : "📋 Copy WhatsApp Invite"}
            </button>
          </div>
        )}

        <div>
          <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)", fontSize: "0.9rem" }}>
            Active Unexpired Invitations ({activeInvitations.length})
          </h4>
          {activeInvitations.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No active invitations for this parking lot.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeInvitations.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    background: "var(--card-bg-subtle)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    padding: "0.6rem 0.8rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 600 }}>
                      ...{inv.token}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      Expires: {new Date(inv.expiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-text"
                    style={{ fontSize: "0.75rem", color: copiedId === inv.id ? "#15803d" : "var(--primary-color)" }}
                    onClick={() => handleCopy(inv.whatsappMessage, inv.id)}
                  >
                    {copiedId === inv.id ? "✓ Copied!" : "Copy Text"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: "1.25rem", textAlign: "right" }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ width: "auto" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
