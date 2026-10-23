import { useState, useEffect, useCallback } from "react";
import {
  BycmeClient,
  Person,
  Cycle,
  CycleCheckout,
  CycleStatus,
} from "../../../generated/shared";
import { ReturnCycleModal } from "./ReturnCycleModal";

interface CycleQrPortalProps {
  apiClient: BycmeClient;
  qrCode: string;
  authToken: string | null;
  currentUser: Person | null;
  onAuthSuccess: (token: string, user: Person) => void;
  onBackToLanding: () => void;
}

export function CycleQrPortal({
  apiClient,
  qrCode,
  authToken,
  currentUser,
  onAuthSuccess,
  onBackToLanding,
}: CycleQrPortalProps) {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<CycleCheckout | null>(null);
  const [riderHomeParkingId, setRiderHomeParkingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth flow states for unauthenticated visitors
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Load cycle details and caller context
  const loadCycleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cyc = await apiClient.lookupCycle(qrCode, authToken || undefined);
      setCycle(cyc);

      if (authToken) {
        try {
          const coRes = await apiClient.getMyActiveCheckout(authToken);
          setActiveCheckout(coRes.activeCheckout || null);
        } catch {
          // ignore
        }

        try {
          const hpRes = await apiClient.getMyHomeParking(authToken);
          setRiderHomeParkingId(hpRes.parking.id);
        } catch {
          // caller might not be enrolled as a rider yet
          setRiderHomeParkingId(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cycle not found or invalid QR code");
    } finally {
      setLoading(false);
    }
  }, [apiClient, qrCode, authToken]);

  useEffect(() => {
    loadCycleData();
  }, [loadCycleData]);

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiClient.login({ email, password });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      setAuthLoading(false);
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      setAuthLoading(false);
      return;
    }

    try {
      const res = await apiClient.register({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Checkout handler
  const handleCheckout = async () => {
    if (!cycle || !authToken) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const co = await apiClient.checkoutCycle(cycle.id, authToken);
      setActiveCheckout(co);
      setSuccessMsg(`Cycle ${co.publicCycleId || ""} unlocked! Combination code: ${co.lockCode || ""}`);
      loadCycleData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to checkout cycle");
    } finally {
      setActionLoading(false);
    }
  };

  // Return handler
  const handleReturn = async (condition: CycleStatus, notes?: string) => {
    const coId = activeCheckout?.id;
    if (!coId || !authToken) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.returnCheckout(coId, { condition, notes }, authToken);
      setShowReturnModal(false);
      setActiveCheckout(null);
      if (condition !== "Working") {
        setSuccessMsg(`Cycle returned and reported as '${condition}'. Maintenance alerted.`);
      } else {
        setSuccessMsg("Cycle successfully returned to stand.");
      }
      loadCycleData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to return cycle");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="landing-container" style={{ padding: "2rem 1rem" }}>
        <div className="card" style={{ maxWidth: "480px", margin: "2rem auto", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          <h3>Scanning Bicycle QR Code...</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Connecting to Bycme secure portal.</p>
        </div>
      </div>
    );
  }

  if (error || !cycle) {
    return (
      <div className="landing-container" style={{ padding: "2rem 1rem" }}>
        <div className="card" style={{ maxWidth: "480px", margin: "2rem auto", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚫</div>
          <h3 style={{ color: "#dc2626", margin: "0 0 0.5rem 0" }}>Cycle Unavailable</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {error || "No bicycle matches this QR code token."}
          </p>
          <button type="button" className="btn-primary" onClick={onBackToLanding}>
            ← Return to Bycme Home
          </button>
        </div>
      </div>
    );
  }

  // Permission & Validation checks
  const isCheckedOutByMe = activeCheckout?.cycleId === cycle.id || cycle.isCheckedOutByMe;
  const isDamaged = cycle.status !== "Working";
  const isInUseByOther = !cycle.isAvailable && !isCheckedOutByMe;
  const hasOtherActiveCheckout = activeCheckout && activeCheckout.cycleId !== cycle.id;
  const isStationMismatch = riderHomeParkingId && riderHomeParkingId !== cycle.parkingId;
  const isNotRider = currentUser && !currentUser.roles.includes("Rider") && !currentUser.roles.includes("Admin");
  const isNotEnrolled = currentUser && !riderHomeParkingId;

  const canCheckout =
    currentUser &&
    currentUser.roles.includes("Rider") &&
    !isDamaged &&
    !isInUseByOther &&
    !hasOtherActiveCheckout &&
    !isStationMismatch &&
    !isCheckedOutByMe;

  return (
    <div className="landing-container" style={{ padding: "1.5rem 1rem", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <button
          type="button"
          className="btn-text"
          onClick={onBackToLanding}
          style={{ marginBottom: "1rem", color: "var(--text-muted)" }}
        >
          ← Back to Landing Page
        </button>

        {/* Cycle Specification Card */}
        <div
          className="card"
          style={{
            background: "var(--highlight-box)",
            border: "1px solid var(--border-color)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "0.25rem",
                  background: isDamaged ? "#fee2e2" : cycle.isAvailable ? "#dcfce7" : "#fef3c7",
                  color: isDamaged ? "#b91c1c" : cycle.isAvailable ? "#166534" : "#92400e",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {isDamaged ? `⚠️ ${cycle.status}` : cycle.isAvailable ? "● Ready to Ride" : "⏳ In Use"}
              </span>
              <h2 style={{ margin: "0.5rem 0 0.25rem 0", color: "var(--text-main)", fontSize: "1.4rem" }}>
                🚲 {cycle.publicCycleId}
              </h2>
              <div style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 600 }}>
                {cycle.brand} {cycle.cycleModel} • {cycle.colour}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                📍 {cycle.parkingName} {cycle.cityName ? `(${cycle.cityName})` : ""}
              </div>
            </div>
          </div>
        </div>

        {successMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {successMsg}
          </div>
        )}

        {actionError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{actionError}</div>}

        {/* Case 1: Unauthenticated Visitor -> Require Login / Register */}
        {!currentUser ? (
          <div className="card">
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>Authentication Required</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Log in or register with your authorized resident account to checkout this bicycle.
            </p>

            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "1.25rem" }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "none",
                  border: "none",
                  borderBottom: authMode === "login" ? "2px solid var(--primary-color)" : "none",
                  color: authMode === "login" ? "var(--primary-color)" : "var(--text-muted)",
                  fontWeight: authMode === "login" ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  background: "none",
                  border: "none",
                  borderBottom: authMode === "register" ? "2px solid var(--primary-color)" : "none",
                  color: authMode === "register" ? "var(--primary-color)" : "var(--text-muted)",
                  fontWeight: authMode === "register" ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                Create Account
              </button>
            </div>

            {authError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{authError}</div>}

            {authMode === "login" ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. kavita@bycme.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? "Logging in..." : "Log In & Proceed ➔"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Kavita Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. kavita@bycme.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Set password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? "Creating account..." : "Create Account & Proceed ➔"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Authenticated Rider Portal View */
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Authenticated as:</span>
                <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {currentUser.name} ({currentUser.email})
                </div>
              </div>
            </div>

            {/* Subcase A: Already checked out by this rider */}
            {isCheckedOutByMe ? (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "2px solid #22c55e",
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  textAlign: "center",
                }}
              >
                <div style={{ color: "#166534", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                  ✓ You Have Checked Out This Bicycle!
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 1rem 0" }}>
                  Your checkout session is active. Use the mechanical combination code below to unlock the cable.
                </p>

                <div
                  style={{
                    background: "#ffffff",
                    border: "2px dashed #16a34a",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    margin: "0 auto 1.25rem auto",
                    maxWidth: "280px",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
                    Combination Lock Code
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "2rem",
                      fontWeight: 800,
                      letterSpacing: "0.2em",
                      color: "#15803d",
                      margin: "0.25rem 0",
                    }}
                  >
                    🔒 {cycle.lockCode || activeCheckout?.lockCode}
                  </div>
                </div>

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
            ) : hasOtherActiveCheckout ? (
              /* Subcase B: Rider already has another cycle checked out */
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  color: "#92400e",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>⚠️ Checkout Limit Reached</div>
                <div>
                  You already have an active checkout on cycle <strong>{activeCheckout?.publicCycleId}</strong>. Bycme policy enforces a limit of 1 cycle per rider at any time.
                </div>
              </div>
            ) : isNotRider ? (
              /* Subcase C: Not a rider */
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  color: "#991b1b",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>🚫 Rider Role Required</div>
                <div>
                  Your account does not possess the Rider role. Please accept a resident invitation to join a bicycle parking stand.
                </div>
              </div>
            ) : isNotEnrolled ? (
              /* Subcase D: No home stand */
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  color: "#991b1b",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>🚫 No Home Stand Assigned</div>
                <div>
                  You are not currently enrolled in any bicycle parking stand. Please join your residential stand via invitation.
                </div>
              </div>
            ) : isStationMismatch ? (
              /* Subcase E: Station Mismatch */
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  color: "#c2410c",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>🚫 Parking Stand Mismatch</div>
                <div>
                  This cycle is stationed at <strong>{cycle.parkingName}</strong>. You are registered at a different parking stand. Riders may only checkout bicycles from their designated home stand.
                </div>
              </div>
            ) : isDamaged ? (
              /* Subcase F: Cycle Damaged */
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  color: "#991b1b",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>✕ Bicycle Unavailable</div>
                <div>
                  This cycle is currently marked as <strong>{cycle.status}</strong> and cannot be checked out until repaired by the parking manager.
                </div>
              </div>
            ) : isInUseByOther ? (
              /* Subcase G: In use by another rider */
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  color: "#92400e",
                  fontSize: "0.9rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>⏳ Bicycle In Use</div>
                <div>
                  This cycle is currently in use by another resident rider. Please select an available bicycle from the stand.
                </div>
              </div>
            ) : canCheckout ? (
              /* Subcase H: All checks pass -> Checkout Action */
              <div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  This bicycle is available and stationed at your registered home stand. Click below to checkout and reveal the mechanical combination lock code.
                </p>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCheckout}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Unlocking..." : "🔓 Checkout Cycle & Reveal Lock Code ➔"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {showReturnModal && (
        <ReturnCycleModal
          cycleIdentifier={cycle.publicCycleId}
          brand={cycle.brand}
          cycleModel={cycle.cycleModel}
          loading={actionLoading}
          error={actionError}
          onConfirm={handleReturn}
          onClose={() => setShowReturnModal(false)}
        />
      )}
    </div>
  );
}
