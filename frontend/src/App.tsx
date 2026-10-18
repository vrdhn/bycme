import { useState, useEffect } from "react";
import { BycmeClient, HealthStatus } from "../../generated/shared";
import { AdminView } from "./components/AdminView";
import { ManagerView } from "./components/ManagerView";
import { RiderView } from "./components/RiderView";
import { AnonInviteView } from "./components/AnonInviteView";

const API_BASE = "https://bycme-staging.bycme-backend.workers.dev";
const client = new BycmeClient(API_BASE);

type ActiveRole = "Admin" | "Manager" | "Rider" | "Anon";

export default function App() {
  const [activeRole, setActiveRole] = useState<ActiveRole>("Admin");
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Pre-seeded actor identifiers
  const managerId = "usr-manager-alice";
  const riderId = "usr-rider-bob";

  useEffect(() => {
    client.getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="app-shell">
      {/* Top Navigation & Role Switcher */}
      <header className="app-header no-print">
        <div className="header-brand">
          <span className="brand-icon">🚲</span>
          <div>
            <h1 className="brand-title">BYCME</h1>
            <span className="brand-subtitle">Smart Cycle & Parking Sharing Platform</span>
          </div>
        </div>

        <nav className="role-nav">
          <span className="role-label">Switch Role Persona:</span>
          <button
            className={`nav-tab ${activeRole === "Admin" ? "active" : ""}`}
            onClick={() => setActiveRole("Admin")}
          >
            Admin (System)
          </button>
          <button
            className={`nav-tab ${activeRole === "Manager" ? "active" : ""}`}
            onClick={() => setActiveRole("Manager")}
          >
            Manager (Alice)
          </button>
          <button
            className={`nav-tab ${activeRole === "Rider" ? "active" : ""}`}
            onClick={() => setActiveRole("Rider")}
          >
            Rider (Bob)
          </button>
          <button
            className={`nav-tab ${activeRole === "Anon" ? "active" : ""}`}
            onClick={() => setActiveRole("Anon")}
          >
            Claim Invite (Anon)
          </button>
        </nav>

        <div className="header-meta">
          <span className="status-pill">
            <span className="dot dot-online"></span>
            {health ? health.status : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main View Area */}
      <main className="app-main">
        {activeRole === "Admin" && <AdminView client={client} />}
        {activeRole === "Manager" && <ManagerView client={client} managerId={managerId} />}
        {activeRole === "Rider" && <RiderView client={client} riderId={riderId} />}
        {activeRole === "Anon" && <AnonInviteView client={client} />}
      </main>
    </div>
  );
}
