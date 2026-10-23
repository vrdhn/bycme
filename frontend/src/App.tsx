import { useState, useEffect, useCallback } from "react";
import { BycmeClient, Person } from "../../generated/shared";
import { StatusBar } from "./components/StatusBar";
import { LoginForm } from "./components/LoginForm";
import { LocationsAdminView } from "./components/LocationsAdminView";
import { ManagerRequestsView } from "./components/ManagerRequestsView";
import { AdminInvitationsView } from "./components/AdminInvitationsView";
import { ManagerWorkspaceView } from "./components/ManagerWorkspaceView";
import { InvitationLanding } from "./components/InvitationLanding";

const API_BASE = "https://bycme-staging.bycme-backend.workers.dev";
const client = new BycmeClient(API_BASE);

export default function App() {
  const [view, setView] = useState<"home" | "login" | "app">("home");
  const [workspaceRole, setWorkspaceRole] = useState<"manager" | "admin" | "rider">("manager");
  const [adminSection, setAdminSection] = useState<"locations" | "requests" | "invitations" | "users">("locations");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(false);

  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#/join/mgr/")) {
      return hash.replace("#/join/mgr/", "").trim();
    }
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/join/mgr/")) {
        setInviteToken(hash.replace("#/join/mgr/", "").trim());
      } else {
        setInviteToken(null);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const fetchSession = useCallback(async (token: string) => {
    try {
      const user = await client.getMe(token);
      setCurrentUser(user);
      setAuthToken(token);
      if (user.roles.includes("Admin") && !user.roles.includes("Manager")) {
        setWorkspaceRole("admin");
      } else if (user.roles.includes("Manager")) {
        setWorkspaceRole("manager");
      } else if (user.roles.includes("Rider")) {
        setWorkspaceRole("rider");
      }
    } catch {
      localStorage.removeItem("bycme-token");
      setCurrentUser(null);
      setAuthToken(null);
    }
  }, []);

  const loadPersons = useCallback(async (token: string) => {
    setLoadingPersons(true);
    try {
      const list = await client.listPersons(token);
      setPersons(list);
    } catch {
      setPersons([]);
    } finally {
      setLoadingPersons(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("bycme-token");
    if (savedToken) {
      fetchSession(savedToken);
    }
  }, [fetchSession]);

  useEffect(() => {
    if (view === "app" && authToken && currentUser?.roles.includes("Admin") && adminSection === "users") {
      loadPersons(authToken);
    }
  }, [view, authToken, currentUser, adminSection, loadPersons]);

  const handleLoginSuccess = (token: string, user: Person) => {
    localStorage.setItem("bycme-token", token);
    setAuthToken(token);
    setCurrentUser(user);
    if (user.roles.includes("Admin") && !user.roles.includes("Manager")) {
      setWorkspaceRole("admin");
    } else if (user.roles.includes("Manager")) {
      setWorkspaceRole("manager");
    } else if (user.roles.includes("Rider")) {
      setWorkspaceRole("rider");
    }
    setView("app");
  };

  const handleLogout = () => {
    localStorage.removeItem("bycme-token");
    setAuthToken(null);
    setCurrentUser(null);
    setPersons([]);
    setView("home");
  };

  if (inviteToken) {
    return (
      <>
        <StatusBar
          apiClient={client}
          currentUser={currentUser}
          onBrandClick={() => {
            window.location.hash = "";
            setInviteToken(null);
            setView("home");
          }}
          onLogout={handleLogout}
        />
        <InvitationLanding
          apiClient={client}
          token={inviteToken}
          authToken={authToken}
          currentUser={currentUser}
          onAuthSuccess={(t, u) => {
            handleLoginSuccess(t, u);
          }}
          onBackToLanding={() => {
            window.location.hash = "";
            setInviteToken(null);
            setView("home");
          }}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar
        apiClient={client}
        currentUser={currentUser}
        onBrandClick={() => setView("home")}
        onLogout={handleLogout}
      />

      {view === "home" && (
        <main className="welcome-container">
          <div className="hero-card">
            <div className="logo-icon">🚲</div>
            <h1 className="hero-title">Welcome by Bycme</h1>
            <p className="tagline">
              Community bicycle sharing platform for seamless campus and facility mobility.
            </p>

            {currentUser ? (
              <div
                style={{
                  background: "var(--card-bg-subtle)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  padding: "0.85rem 1rem",
                  marginBottom: "1.5rem",
                  width: "100%",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Active Session
                </div>
                <div style={{ fontWeight: 600, color: "var(--text-main)", margin: "0.2rem 0" }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {currentUser.email}
                </div>
              </div>
            ) : null}

            <div className="action-section">
              {currentUser ? (
                <button className="btn-primary" onClick={() => setView("app")}>
                  Open App Workspace ➔
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setView("login")}>
                  Proceed to App ➔
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {view === "login" && (
        <main className="welcome-container">
          <LoginForm
            apiClient={client}
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => setView("home")}
          />
        </main>
      )}

      {view === "app" && (
        <main className="app-container">
          <div className="app-nav-header">
            <button className="btn-text" onClick={() => setView("home")}>
              ← Back to Landing Page
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              /app
            </span>
          </div>

          {!currentUser ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
              <p style={{ marginBottom: "1rem" }}>
                Authentication required to access workspace.
              </p>
              <button className="btn-primary" onClick={() => setView("login")}>
                Sign In ➔
              </button>
            </div>
          ) : (
            <>
              {/* User Header Card */}
              <div className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <h2 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>
                      Hello, {currentUser.name}
                    </h2>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                      {currentUser.email}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {currentUser.roles.map((r) => (
                      <span key={r} className={`badge-role badge-${r}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top-Level Workspace Selector */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "1.25rem",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  {currentUser.roles.includes("Manager") && (
                    <button
                      type="button"
                      className={workspaceRole === "manager" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.4rem 1.25rem", fontSize: "0.9rem" }}
                      onClick={() => setWorkspaceRole("manager")}
                    >
                      👔 Manager Workspace
                    </button>
                  )}

                  {currentUser.roles.includes("Admin") && (
                    <button
                      type="button"
                      className={workspaceRole === "admin" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.4rem 1.25rem", fontSize: "0.9rem" }}
                      onClick={() => setWorkspaceRole("admin")}
                    >
                      🛡️ Admin Console
                    </button>
                  )}

                  {currentUser.roles.includes("Rider") && (
                    <button
                      type="button"
                      className={workspaceRole === "rider" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.4rem 1.25rem", fontSize: "0.9rem" }}
                      onClick={() => setWorkspaceRole("rider")}
                    >
                      🚲 Rider Workspace
                    </button>
                  )}
                </div>
              </div>

              {/* Rider Workspace View */}
              {workspaceRole === "rider" && currentUser.roles.includes("Rider") && (
                <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>🚲 Rider Workspace</h3>
                  <p style={{ margin: 0 }}>Rider console and bike reservation features are upcoming.</p>
                </div>
              )}

              {/* Manager Workspace View */}
              {workspaceRole === "manager" && currentUser.roles.includes("Manager") && authToken && (
                <ManagerWorkspaceView apiClient={client} token={authToken} />
              )}

              {/* Admin Navigation Controls */}
              {workspaceRole === "admin" && currentUser.roles.includes("Admin") && (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      className={adminSection === "locations" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.5rem 1.25rem" }}
                      onClick={() => setAdminSection("locations")}
                    >
                      📍 Locations (Cities / Buildings / Parkings)
                    </button>
                    <button
                      className={adminSection === "requests" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.5rem 1.25rem" }}
                      onClick={() => setAdminSection("requests")}
                    >
                      📬 Manager Requests
                    </button>
                    <button
                      className={adminSection === "invitations" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.5rem 1.25rem" }}
                      onClick={() => setAdminSection("invitations")}
                    >
                      🎟️ Invitations
                    </button>
                    <button
                      className={adminSection === "users" ? "btn-primary" : "btn-secondary"}
                      style={{ width: "auto", padding: "0.5rem 1.25rem" }}
                      onClick={() => setAdminSection("users")}
                    >
                      👥 User Directory
                    </button>
                  </div>

                  {adminSection === "locations" && authToken && (
                    <LocationsAdminView apiClient={client} token={authToken} />
                  )}

                  {adminSection === "requests" && authToken && (
                    <ManagerRequestsView apiClient={client} token={authToken} />
                  )}

                  {adminSection === "invitations" && authToken && (
                    <AdminInvitationsView apiClient={client} token={authToken} />
                  )}

                  {adminSection === "users" && (
                    <div className="card">
                      <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
                        User Directory (Admin Access)
                      </h3>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                        Listing all persons protected by Bearer token authorization.
                      </p>

                      {loadingPersons ? (
                        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
                          Loading user accounts...
                        </p>
                      ) : persons.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
                          No user accounts found.
                        </p>
                      ) : (
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Roles</th>
                              <th>Registered</th>
                            </tr>
                          </thead>
                          <tbody>
                            {persons.map((p) => (
                              <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                <td style={{ color: "var(--text-secondary)" }}>{p.email}</td>
                                <td>
                                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                                    {p.roles.map((r) => (
                                      <span key={r} className={`badge-role badge-${r}`}>
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      )}
    </>
  );
}
