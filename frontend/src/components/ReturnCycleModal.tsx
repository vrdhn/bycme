import { useState } from "react";
import { CycleStatus } from "../../../generated/shared";

interface ReturnCycleModalProps {
  cycleIdentifier?: string;
  brand?: string;
  cycleModel?: string;
  loading: boolean;
  error?: string | null;
  onConfirm: (condition: CycleStatus, notes?: string) => Promise<void>;
  onClose: () => void;
}

export function ReturnCycleModal({
  cycleIdentifier,
  brand,
  cycleModel,
  loading,
  error,
  onConfirm,
  onClose,
}: ReturnCycleModalProps) {
  const [condition, setCondition] = useState<CycleStatus>("Working");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(condition, notes.trim() || undefined);
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
          width: "100%",
          maxWidth: "480px",
          background: "var(--card-bg)",
          borderRadius: "0.75rem",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)", fontSize: "1.2rem" }}>
              🚲 Return & Check-in Cycle
            </h3>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {cycleIdentifier ? `Cycle: ${cycleIdentifier}` : "Active Checkout"}
              {brand || cycleModel ? ` • ${brand || ""} ${cycleModel || ""}`.trim() : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "var(--text-muted)",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Cycle Condition Upon Return:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: condition === "Working" ? "2px solid #22c55e" : "1px solid var(--border-color)",
                  background: condition === "Working" ? "#f0fdf4" : "var(--card-bg-subtle)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="condition"
                  value="Working"
                  checked={condition === "Working"}
                  onChange={() => setCondition("Working")}
                  style={{ marginTop: "0.2rem" }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#15803d" }}>
                    ✓ Working (Good Condition)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Ready for the next rider. No mechanical or tyre issues.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: condition === "Puncture" ? "2px solid #eab308" : "1px solid var(--border-color)",
                  background: condition === "Puncture" ? "#fefce8" : "var(--card-bg-subtle)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="condition"
                  value="Puncture"
                  checked={condition === "Puncture"}
                  onChange={() => setCondition("Puncture")}
                  style={{ marginTop: "0.2rem" }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#854d0e" }}>
                    ⚠️ Puncture (Flat Tyre)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Takes cycle out of service until repaired by HubHero.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.5rem",
                  border: condition === "Broken" ? "2px solid #ef4444" : "1px solid var(--border-color)",
                  background: condition === "Broken" ? "#fef2f2" : "var(--card-bg-subtle)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="condition"
                  value="Broken"
                  checked={condition === "Broken"}
                  onChange={() => setCondition("Broken")}
                  style={{ marginTop: "0.2rem" }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#b91c1c" }}>
                    ❌ Broken (Mechanical Damage)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Chain, pedals, brakes, or gear issue. Cycle marked unavailable.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Damage / Issue Notes (Optional):
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="e.g. Rear tyre lost air, handlebar loose, chain slipped..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", fontSize: "0.85rem", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ fontSize: "0.85rem" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                fontSize: "0.85rem",
                background: condition === "Working" ? "#16a34a" : "#ea580c",
                borderColor: condition === "Working" ? "#16a34a" : "#ea580c",
              }}
            >
              {loading ? "Checking in..." : "Confirm Return ➔"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
