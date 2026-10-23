import { useState } from "react";
import { BycmeClient } from "../../generated/shared";
import { StatusBar } from "./components/StatusBar";

const API_BASE = "https://bycme-staging.bycme-backend.workers.dev";
const client = new BycmeClient(API_BASE);

export default function App() {
  const [view, setView] = useState<"home" | "app">("home");

  return (
    <>
      <StatusBar apiClient={client} onBrandClick={() => setView("home")} />

      {view === "home" ? (
        <main className="welcome-container">
          <div className="hero-card">
            <div className="logo-icon">🚲</div>
            <h1 className="hero-title">Welcome by Bycme</h1>
            <p className="tagline">
              Community bicycle sharing platform for seamless campus and facility mobility.
            </p>
            <div className="action-section">
              <button
                className="btn-primary"
                onClick={() => setView("app")}
              >
                Proceed to App ➔
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="app-container">
          <div className="app-nav-header">
            <button className="btn-text" onClick={() => setView("home")}>
              ← Back to Landing Page
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              /app
            </span>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: "0.5rem" }}>Bycme Application Workspace</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Application ready for feature workflows.
            </p>
          </div>
        </main>
      )}
    </>
  );
}
