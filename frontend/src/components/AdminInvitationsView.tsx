import { useState, useEffect, useCallback } from "react";
import { BycmeClient, ManagerInvitation } from "../../../generated/shared";

interface AdminInvitationsViewProps {
  apiClient: BycmeClient;
  token: string;
}

export function AdminInvitationsView({ apiClient, token }: AdminInvitationsViewProps) {
  const [invitations, setInvitations] = useState<ManagerInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "used" | "revoked" | "all">("active");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.listAdminInvitations(token, filter !== "all" ? filter : undefined);
      setInvitations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, [apiClient, token, filter]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleExpire = async (id: string, parkingName?: string) => {
    try {
      await apiClient.revokeAdminInvitation(id, token);
      setFeedback(`Revoked invitation link for ${parkingName || "parking station"}.`);
      setTimeout(() => setFeedback(null), 3000);
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to expire invitation");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>🎟️ Invitations Console</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Monitor and expire manager invitation links across all parking stations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["active", "used", "revoked", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={filter === tab ? "btn-primary" : "btn-secondary"}
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", textTransform: "capitalize" }}
              onClick={() => setFilter(tab)}
            >
              {tab === "active" ? "Active (Unexpired)" : tab}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {feedback}
        </div>
      )}

      {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          Loading invitations...
        </div>
      ) : invitations.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          No {filter} invitations found.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--card-bg-subtle)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Parking Station</th>
                <th style={{ padding: "0.75rem 1rem" }}>Token / Link</th>
                <th style={{ padding: "0.75rem 1rem" }}>Type</th>
                <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem" }}>Expires</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      📍 {inv.parkingName || inv.parkingId}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {inv.cityName || "City"} • Created by {inv.createdByName || "Admin"}
                    </div>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600 }}>
                      ...{inv.token}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {inv.inviteUrl}
                    </div>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "0.25rem",
                        fontWeight: 600,
                        background: inv.isPreapproved ? "#fef3c7" : "#e0f2fe",
                        color: inv.isPreapproved ? "#92400e" : "#0369a1",
                      }}
                    >
                      {inv.isPreapproved ? "⚡ Pre-Approved" : "📋 Standard"}
                    </span>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "0.25rem",
                        fontWeight: 600,
                        background:
                          inv.status === "active"
                            ? "#f0fdf4"
                            : inv.status === "used"
                            ? "#e0e7ff"
                            : "#fef2f2",
                        color:
                          inv.status === "active"
                            ? "#15803d"
                            : inv.status === "used"
                            ? "#3730a3"
                            : "#b91c1c",
                      }}
                    >
                      {inv.status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {new Date(inv.expiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>

                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.75rem",
                          background: copiedId === inv.id ? "#15803d" : "var(--primary-color)",
                        }}
                        onClick={() => handleCopy(inv.whatsappMessage, inv.id)}
                      >
                        {copiedId === inv.id ? "✓ Copied!" : "📋 Copy Text"}
                      </button>

                      {inv.status === "active" && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", color: "#b91c1c" }}
                          onClick={() => handleExpire(inv.id, inv.parkingName)}
                        >
                          🚫 Expire
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
