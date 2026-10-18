import { useState, useEffect } from "react";
import { BycmeClient, HealthStatus, PersonRole } from "../../generated/shared";
import { AdminView } from "./components/AdminView";
import { ManagerView } from "./components/ManagerView";
import { RiderView } from "./components/RiderView";
import { AnonInviteView } from "./components/AnonInviteView";

const API_BASE = "https://bycme-staging.bycme-backend.workers.dev";
const client = new BycmeClient(API_BASE);

// Staging environment detection
const IS_STAGING =
  import.meta.env.MODE === "staging" ||
  import.meta.env.MODE === "development" ||
  import.meta.env.DEV ||
  (typeof window !== "undefined" &&
    (window.location.hostname.includes("staging") ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"));

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  roles: PersonRole[];
}

export const SEED_USERS: SeedUser[] = [
  { id: "usr-aarav", name: "Aarav Sharma", email: "aarav@bycme.local", roles: ["Admin", "Rider"] },
  { id: "usr-priya", name: "Priya Patel", email: "priya@bycme.local", roles: ["Manager", "Rider"] },
  { id: "usr-rohan", name: "Rohan Verma", email: "rohan@bycme.local", roles: ["Manager", "Rider"] },
  { id: "usr-ananya", name: "Ananya Iyer", email: "ananya@bycme.local", roles: ["Manager", "Rider"] },
  { id: "usr-vikram", name: "Vikram Singh", email: "vikram@bycme.local", roles: ["Rider"] },
  { id: "usr-neha", name: "Neha Gupta", email: "neha@bycme.local", roles: ["Rider"] },
  { id: "usr-rahul", name: "Rahul Nair", email: "rahul@bycme.local", roles: ["Rider"] },
  { id: "usr-pooja", name: "Pooja Reddy", email: "pooja@bycme.local", roles: ["Rider"] },
  { id: "usr-aditya", name: "Aditya Joshi", email: "aditya@bycme.local", roles: ["Rider"] },
  { id: "usr-kavita", name: "Kavita Rao", email: "kavita@bycme.local", roles: ["Rider"] },
];

type ActiveTab = "Admin" | "Manager" | "Rider" | "Anon";

export default function App() {
  const [currentUser, setCurrentUser] = useState<SeedUser | null>(SEED_USERS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("Admin");
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Manual auth form state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    client.getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  function handleLoginAs(user: SeedUser) {
    setCurrentUser(user);
    if (user.roles.includes("Admin")) {
      setActiveTab("Admin");
    } else if (user.roles.includes("Manager")) {
      setActiveTab("Manager");
    } else {
      setActiveTab("Rider");
    }
    setAuthError("");
  }

  function handleLogout() {
    setCurrentUser(null);
    setActiveTab("Anon");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
  }

  function handleManualLogin(e: React.FormEvent) {
    e.preventDefault();
    const matched = SEED_USERS.find(
      (u) => u.email.toLowerCase() === authEmail.trim().toLowerCase()
    );
    if (matched && authPassword === "test") {
      handleLoginAs(matched);
    } else {
      setAuthError("Invalid credentials. (Hint: Test accounts password is 'test')");
    }
  }

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="app-header no-print">
        <div className="header-brand">
          <span className="brand-icon">🚲</span>
          <div>
            <h1 className="brand-title">BYCME</h1>
            <span className="brand-subtitle">Smart Cycle & Parking Platform</span>
          </div>
        </div>

        {/* Persona / Nav Tabs */}
        {currentUser ? (
          <nav className="role-nav">
            <span className="role-label">Console:</span>
            {currentUser.roles.includes("Admin") && (
              <button
                className={`nav-tab ${activeTab === "Admin" ? "active" : ""}`}
                onClick={() => setActiveTab("Admin")}
              >
                Admin
              </button>
            )}
            {currentUser.roles.includes("Manager") && (
              <button
                className={`nav-tab ${activeTab === "Manager" ? "active" : ""}`}
                onClick={() => setActiveTab("Manager")}
              >
                Manager
              </button>
            )}
            {currentUser.roles.includes("Rider") && (
              <button
                className={`nav-tab ${activeTab === "Rider" ? "active" : ""}`}
                onClick={() => setActiveTab("Rider")}
              >
                Rider
              </button>
            )}
            <button
              className={`nav-tab ${activeTab === "Anon" ? "active" : ""}`}
              onClick={() => setActiveTab("Anon")}
            >
              Claim Invite
            </button>
          </nav>
        ) : (
          <nav className="role-nav">
            <button
              className={`nav-tab ${activeTab === "Anon" ? "active" : ""}`}
              onClick={() => setActiveTab("Anon")}
            >
              Claim Invitation
            </button>
          </nav>
        )}

        {/* User Session & Status */}
        <div className="header-meta">
          {currentUser ? (
            <div className="user-session-bar">
              <span className="user-badge-name">
                <strong>{currentUser.name}</strong>
                <span className="user-role-tag">{currentUser.roles.join(", ")}</span>
              </span>
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <span className="text-muted text-sm">Not authenticated</span>
          )}

          <span className="status-pill">
            <span className="dot dot-online"></span>
            {health ? health.status : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Staging Quick-Switcher Toolbar (Single Click Logout & Login) */}
      {IS_STAGING && (
        <div className="staging-quick-toolbar no-print">
          <div className="quick-toolbar-label">
            <span className="bolt">⚡</span>
            <span>Staging Quick Login:</span>
          </div>
          <div className="quick-users-list">
            {SEED_USERS.map((user) => {
              const isSelected = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  className={`quick-user-btn ${isSelected ? "selected" : ""}`}
                  onClick={() => handleLoginAs(user)}
                  title={`Switch to ${user.name} (${user.email})`}
                >
                  <span className="quick-btn-name">{user.name.split(" ")[0]}</span>
                  <span className={`badge-pill badge-${user.roles[0].toLowerCase()}`}>
                    {user.roles[0]}
                  </span>
                </button>
              );
            })}
            {currentUser && (
              <button className="quick-user-btn logout-btn" onClick={handleLogout} title="Log out to Auth page">
                ✕ Logout
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="app-main">
        {/* If user logged out and not on invite claim tab, display Auth Page */}
        {!currentUser && activeTab !== "Anon" ? (
          <div className="auth-page-container">
            <div className="card auth-card">
              <h2>Account Login</h2>
              <p className="sub-text">Enter your registered email and password to access Bycme.</p>

              {authError && <div className="banner-error">{authError}</div>}

              <form onSubmit={handleManualLogin} className="form-stack">
                <label>
                  Email Address:
                  <input
                    type="email"
                    placeholder="e.g. aarav@bycme.local"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Password:
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="btn-primary">Sign In</button>
              </form>

              <div className="auth-footer-links">
                <button className="link-btn" onClick={() => setActiveTab("Anon")}>
                  Have an invitation code? Claim Invitation →
                </button>
              </div>

              {/* Staging Fast Testing Login Block in Auth Page */}
              {IS_STAGING && (
                <div className="staging-auth-panel">
                  <div className="staging-panel-title">⚡ Staging Fast Testing Login</div>
                  <p className="sub-text">Single-click to log in as any pre-seeded staging user (password: test):</p>
                  <div className="staging-grid">
                    {SEED_USERS.map((u) => (
                      <button
                        key={u.id}
                        className="btn-staging-user"
                        onClick={() => handleLoginAs(u)}
                      >
                        <span className="user-name">{u.name}</span>
                        <span className="user-meta">{u.roles.join("/")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeTab === "Admin" && <AdminView client={client} />}
            {activeTab === "Manager" && currentUser && (
              <ManagerView client={client} managerId={currentUser.id} />
            )}
            {activeTab === "Rider" && currentUser && (
              <RiderView client={client} riderId={currentUser.id} />
            )}
            {activeTab === "Anon" && <AnonInviteView client={client} />}
          </>
        )}
      </main>
    </div>
  );
}
