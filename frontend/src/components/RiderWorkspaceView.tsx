import { useState, useEffect, useCallback } from "react";
import {
  BycmeClient,
  Parking,
  Cycle,
  CycleCheckout,
  CycleStatus,
} from "../../../generated/shared";
import { ReturnCycleModal } from "./ReturnCycleModal";

interface RiderWorkspaceViewProps {
  apiClient: BycmeClient;
  token: string;
}

export function RiderWorkspaceView({ apiClient, token }: RiderWorkspaceViewProps) {
  const [parking, setParking] = useState<Parking | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeCheckout, setActiveCheckout] = useState<CycleCheckout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getMyHomeParking(token);
      setParking(res.parking);
      setCycles(res.cycles);
      setActiveCheckout(res.activeCheckout || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rider workspace data");
    } finally {
      setLoading(false);
    }
  }, [apiClient, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckout = async (cycleId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const co = await apiClient.checkoutCycle(cycleId, token);
      setActiveCheckout(co);
      setSuccessMsg(`Successfully checked out cycle ${co.publicCycleId || ""}! Lock code: ${co.lockCode || ""}`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (condition: CycleStatus, notes?: string) => {
    if (!activeCheckout) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiClient.returnCheckout(activeCheckout.id, { condition, notes }, token);
      setShowReturnModal(false);
      setActiveCheckout(null);
      if (condition !== "Working") {
        setSuccessMsg(`Cycle returned and reported as '${condition}'. Thank you for alerting maintenance!`);
      } else {
        setSuccessMsg("Cycle successfully returned to stand.");
      }
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Return failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
        <div>Loading rider workspace and home hub...</div>
      </div>
    );
  }

  if (error && !parking) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚲</div>
        <h3 style={{ color: "#dc2626", margin: "0 0 0.5rem 0" }}>No Home Hub Assigned</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto 1.5rem auto" }}>
          {error}
        </p>
      </div>
    );
  }

  const availableCount = cycles.filter((c) => c.isAvailable).length;

  return (
    <div>
      {/* Home Station Header Card */}
      {parking && (
        <div className="card" style={{ marginBottom: "1.25rem", background: "var(--highlight-box)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "0.25rem",
                  background: "#dcfce7",
                  color: "#166534",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                🏠 Your Home Hub
              </span>
              <h2 style={{ margin: "0.4rem 0 0.2rem 0", color: "var(--text-main)", fontSize: "1.3rem" }}>
                📍 {parking.name}
              </h2>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {parking.buildingName || "Club"}
                {parking.cityName ? `, ${parking.cityName}` : ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div
                style={{
                  background: "var(--card-bg-subtle)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Available Bikes
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--primary-color)" }}>
                  {availableCount} / {cycles.length} Cycles
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Active Checkout Banner */}
      {activeCheckout && (
        <div
          className="card"
          style={{
            background: "#f0fdf4",
            border: "2px solid #22c55e",
            marginBottom: "1.5rem",
            padding: "1.25rem 1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span
                style={{
                  background: "#22c55e",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.6rem",
                  borderRadius: "1rem",
                  letterSpacing: "0.05em",
                }}
              >
                ✓ ACTIVE RIDE CHECKOUT
              </span>
              <h3 style={{ margin: "0.6rem 0 0.25rem 0", color: "#14532d", fontSize: "1.4rem" }}>
                🚲 {activeCheckout.publicCycleId || "Cycle"} ({activeCheckout.brand} {activeCheckout.cycleModel})
              </h3>
              <div style={{ fontSize: "0.85rem", color: "#166534" }}>
                Frame Colour: <strong>{activeCheckout.colour}</strong> • Checked out on {new Date(activeCheckout.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Lock Code Badge */}
            <div
              style={{
                background: "#ffffff",
                border: "2px dashed #16a34a",
                borderRadius: "0.5rem",
                padding: "0.6rem 1.25rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>
                Combination Lock Code
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  color: "#15803d",
                  margin: "0.2rem 0",
                }}
              >
                🔒 {activeCheckout.lockCode}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Align wheels to unlock cable
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", borderTop: "1px solid #bbf7d0", paddingTop: "0.85rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn-primary"
              style={{ background: "#16a34a", borderColor: "#16a34a" }}
              disabled={actionLoading}
              onClick={() => setShowReturnModal(true)}
            >
              Return Cycle to Stand ➔
            </button>
          </div>
        </div>
      )}

      {/* Stand Cycles Fleet */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-main)" }}>
            🚲 Station Cycle Fleet
          </h3>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {activeCheckout ? "1 cycle checkout limit reached" : "Select an available bicycle to checkout"}
          </span>
        </div>

        {cycles.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            No bicycles stationed at this stand currently.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--card-bg-subtle)", borderBottom: "1px solid var(--border-color)" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Cycle ID</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Brand & Model</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Colour</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Condition</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Availability</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cyc) => {
                  const isCheckedOutThisCycle = activeCheckout?.cycleId === cyc.id;
                  const isAvailable = cyc.isAvailable && !activeCheckout;

                  return (
                    <tr
                      key={cyc.id}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        background: isCheckedOutThisCycle ? "#f0fdf4" : undefined,
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-main)" }}>
                        {cyc.publicCycleId}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 600 }}>{cyc.brand}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{cyc.cycleModel}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.25rem",
                            background: "var(--card-bg-subtle)",
                            border: "1px solid var(--border-color)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {cyc.colour}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "0.25rem",
                            background:
                              cyc.status === "Working"
                                ? "#f0fdf4"
                                : cyc.status === "Puncture"
                                ? "#fefce8"
                                : "#fef2f2",
                            color:
                              cyc.status === "Working"
                                ? "#15803d"
                                : cyc.status === "Puncture"
                                ? "#854d0e"
                                : "#b91c1c",
                          }}
                        >
                          {cyc.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {isCheckedOutThisCycle ? (
                          <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.8rem" }}>
                            ✓ Riding Now
                          </span>
                        ) : cyc.isAvailable ? (
                          <span style={{ color: "#15803d", fontWeight: 600, fontSize: "0.8rem" }}>
                            ● Ready to Ride
                          </span>
                        ) : cyc.status !== "Working" ? (
                          <span style={{ color: "#dc2626", fontSize: "0.8rem" }}>
                            ✕ Out of Service
                          </span>
                        ) : (
                          <span style={{ color: "#d97706", fontSize: "0.8rem" }}>
                            ⏳ In Use by Rider
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                        {isCheckedOutThisCycle ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                            disabled={actionLoading}
                            onClick={() => setShowReturnModal(true)}
                          >
                            Return ➔
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                            disabled={!isAvailable || actionLoading}
                            onClick={() => handleCheckout(cyc.id)}
                            title={
                              activeCheckout
                                ? "You already have an active checkout"
                                : !cyc.isAvailable
                                ? "Cycle unavailable"
                                : "Checkout this bicycle"
                            }
                          >
                            {activeCheckout ? "Limit 1" : "Checkout 🚲"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReturnModal && activeCheckout && (
        <ReturnCycleModal
          cycleIdentifier={activeCheckout.publicCycleId}
          brand={activeCheckout.brand}
          cycleModel={activeCheckout.cycleModel}
          loading={actionLoading}
          error={error}
          onConfirm={handleReturn}
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </div>
  );
}
