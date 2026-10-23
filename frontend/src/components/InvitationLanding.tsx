import { useState, useEffect, useCallback } from "react";
import {
  BycmeClient,
  Person,
  InvitationDetails,
  ManagerRequest,
  RespondInvitationResponse,
} from "../../../generated/shared";

interface InvitationLandingProps {
  apiClient: BycmeClient;
  token: string;
  authToken: string | null;
  currentUser: Person | null;
  onAuthSuccess: (token: string, user: Person) => void;
  onBackToLanding: () => void;
}

export function InvitationLanding({
  apiClient,
  token,
  authToken,
  currentUser,
  onAuthSuccess,
  onBackToLanding,
}: InvitationLandingProps) {
  const [invite, setInvite] = useState<InvitationDetails | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Auth flow states
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Manager action states
  const [existingRequests, setExistingRequests] = useState<ManagerRequest[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<RespondInvitationResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load invitation details
  useEffect(() => {
    let active = true;
    setInviteLoading(true);
    setInviteError(null);

    apiClient
      .getInvitation(token)
      .then((data) => {
        if (active) {
          setInvite(data);
          setInviteLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setInviteError(
            err instanceof Error ? err.message : "Invalid or expired invitation link"
          );
          setInviteLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [apiClient, token]);

  // Load caller's requests if authenticated
  const loadUserRequests = useCallback(async () => {
    if (!authToken) return;
    try {
      const list = await apiClient.getMyManagerRequests(authToken);
      setExistingRequests(list);
    } catch {
      // ignore
    }
  }, [apiClient, authToken]);

  useEffect(() => {
    if (authToken) {
      loadUserRequests();
    }
  }, [authToken, loadUserRequests]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await apiClient.login({ email, password });
      onAuthSuccess(res.token, res.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      // Clever hint if user might not have account
      if (msg.toLowerCase().includes("invalid email or password")) {
        setAuthError("Invalid credentials. If you do not have an account yet, click 'Create an Account' below.");
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Register submission
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
      setAuthError(err instanceof Error ? err.message : "Account registration failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Respond (Claim or Request)
  const handleRespond = async () => {
    if (!authToken) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const result = await apiClient.respondToInvitation(token, authToken);
      setActionResult(result);
      loadUserRequests();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to process invitation");
    } finally {
      setActionLoading(false);
    }
  };

  // Match existing request for target parking
  const targetParkingRequest = invite
    ? existingRequests.find((r) => r.parkingId === invite.parkingId)
    : undefined;

  if (inviteLoading) {
    return (
      <div className="landing-container" style={{ padding: "2rem 1rem" }}>
        <div className="card" style={{ maxWidth: "480px", margin: "2rem auto", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          <h3>Validating Invitation Link...</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Connecting to Bycme secure portal.</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="landing-container" style={{ padding: "2rem 1rem" }}>
        <div className="card" style={{ maxWidth: "500px", margin: "2rem auto", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚫</div>
          <h3 style={{ color: "#dc2626", margin: "0 0 0.5rem 0" }}>Invitation Unavailable</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {inviteError || "This invitation link is invalid, has expired, or was already claimed."}
          </p>
          <button className="btn-primary" onClick={onBackToLanding}>
            ← Return to Bycme Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-container" style={{ padding: "1.5rem 1rem", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ maxWidth: "540px", margin: "0 auto" }}>
        <button
          className="btn-text"
          onClick={onBackToLanding}
          style={{ marginBottom: "1rem", color: "var(--text-muted)" }}
        >
          ← Back to Landing Page
        </button>

        {/* Invitation Context Card */}
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
                  background: invite.isPreapproved ? "#fef3c7" : "#e0f2fe",
                  color: invite.isPreapproved ? "#92400e" : "#0369a1",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {invite.isPreapproved ? "⚡ Pre-Approved Invitation" : "📋 Standard Invitation"}
              </span>
              <h2 style={{ margin: "0.5rem 0 0.25rem 0", color: "var(--text-main)", fontSize: "1.3rem" }}>
                🔑 Manage {invite.parkingName}
              </h2>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {invite.buildingName || "Building"}
                {invite.cityName ? `, ${invite.cityName}` : ""}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.5 }}>
            <strong>{invite.createdByName || "Administrator"}</strong> has invited you to oversee bicycle parking operations for this station.
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Expires: {new Date(invite.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>

        {/* Auth or Action Section */}
        {!currentUser ? (
          <div className="card">
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
                    placeholder="e.g. manager@bycme.in"
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={authLoading}>
                  {authLoading ? "Logging in..." : "Log In & Continue ➔"}
                </button>

                <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError(null);
                    }}
                    style={{ color: "var(--primary-color)", fontWeight: 600, padding: 0 }}
                  >
                    Create an account
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Rajesh Kumar"
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
                    placeholder="e.g. manager@bycme.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Create Password (min 6 characters)</label>
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
                  {authLoading ? "Creating account..." : "Create Account & Continue ➔"}
                </button>

                <div style={{ marginTop: "1rem", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError(null);
                    }}
                    style={{ color: "var(--primary-color)", fontWeight: 600, padding: 0 }}
                  >
                    Log in here
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Authenticated as:</span>
                <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {currentUser.name} ({currentUser.email})
                </div>
              </div>
            </div>

            {actionError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{actionError}</div>}

            {actionResult ? (
              <div
                style={{
                  background: actionResult.status === "active" ? "#f0fdf4" : "#fefce8",
                  border: `1px solid ${actionResult.status === "active" ? "#bbf7d0" : "#fef08a"}`,
                  color: actionResult.status === "active" ? "#166534" : "#854d0e",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                  {actionResult.status === "active" ? "✓ Manager Assigned" : "📬 Request Submitted"}
                </div>
                <div>{actionResult.message}</div>
              </div>
            ) : targetParkingRequest ? (
              <div
                style={{
                  background: targetParkingRequest.status === "approved" ? "#f0fdf4" : "#fefce8",
                  border: `1px solid ${targetParkingRequest.status === "approved" ? "#bbf7d0" : "#fef08a"}`,
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: targetParkingRequest.status === "approved" ? "#166534" : "#854d0e" }}>
                  Existing Application Status: {targetParkingRequest.status.toUpperCase()}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Submitted on {new Date(targetParkingRequest.createdAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  {invite.isPreapproved
                    ? "This invitation is pre-approved. Claiming will directly activate your Manager role for this parking lot."
                    : "Submitting this request will send your application to the Bycme Admin team for approval."}
                </p>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRespond}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Processing..."
                    : invite.isPreapproved
                    ? "Claim Parking Management ➔"
                    : "Submit Request to Manage ➔"}
                </button>
              </div>
            )}

            {/* List user's active requests */}
            {existingRequests.length > 0 && (
              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Your Management Applications ({existingRequests.length})
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {existingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: "0.6rem 0.8rem",
                        background: "var(--card-bg-subtle)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "0.375rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          {req.parkingName || req.parkingId}
                          {req.cityName ? ` (${req.cityName})` : ""}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.15rem 0.4rem",
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
