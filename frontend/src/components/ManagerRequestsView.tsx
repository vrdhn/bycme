import { useState, useEffect, useCallback } from "react";
import { BycmeClient, ManagerRequest } from "../../../generated/shared";

interface ManagerRequestsViewProps {
  apiClient: BycmeClient;
  token: string;
}

export function ManagerRequestsView({ apiClient, token }: ManagerRequestsViewProps) {
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.listAdminManagerRequests(token);
      setRequests(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HubHero requests");
    } finally {
      setLoading(false);
    }
  }, [apiClient, token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (id: string, name?: string) => {
    try {
      await apiClient.approveManagerRequest(id, token);
      setActionSuccess(`Approved HubHero request for ${name || "applicant"}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    }
  };

  const handleReject = async (id: string, name?: string) => {
    try {
      await apiClient.rejectManagerRequest(id, token);
      setActionSuccess(`Rejected HubHero request for ${name || "applicant"}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>📬 HubHero Requests</h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Review and approve management applications from invited HubHeroes.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={filter === tab ? "btn-primary" : "btn-secondary"}
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", textTransform: "capitalize" }}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {actionSuccess}
        </div>
      )}

      {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          Loading requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          No {filter !== "all" ? filter : ""} requests found.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--card-bg-subtle)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Applicant</th>
                <th style={{ padding: "0.75rem 1rem" }}>Hub</th>
                <th style={{ padding: "0.75rem 1rem" }}>City</th>
                <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem" }}>Requested On</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {req.personName || "Unknown Applicant"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {req.personEmail || req.personId}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>
                    {req.parkingName || req.parkingId}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>
                    {req.cityName || "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontWeight: 600,
                        background:
                          req.status === "approved"
                            ? "#f0fdf4"
                            : req.status === "rejected"
                            ? "#fef2f2"
                            : "#fefce8",
                        color:
                          req.status === "approved"
                            ? "#15803d"
                            : req.status === "rejected"
                            ? "#b91c1c"
                            : "#854d0e",
                      }}
                    >
                      {req.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {new Date(req.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    {req.status === "pending" ? (
                      <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", background: "#15803d" }}
                          onClick={() => handleApprove(req.id, req.personName)}
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", color: "#b91c1c" }}
                          onClick={() => handleReject(req.id, req.personName)}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Completed</span>
                    )}
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
