import { useState } from "react";
import { BycmeClient, Person } from "../../../generated/shared";

interface LoginFormProps {
  apiClient: BycmeClient;
  onLoginSuccess: (token: string, user: Person) => void;
  onCancel: () => void;
}

interface SeededAccount {
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Rider" | "Applicant";
  detail: string;
}

const SEEDED_ACCOUNTS: SeededAccount[] = [
  {
    name: "System ClubHero",
    email: "admin@bycme.in",
    role: "Admin",
    detail: "Global ClubHero Console",
  },
  {
    name: "Anita Desai",
    email: "anita@bycme.in",
    role: "Manager",
    detail: "Pune • Gate 1 Residential Hub",
  },
  {
    name: "Vikram Joshi",
    email: "vikram@bycme.in",
    role: "Manager",
    detail: "Pune • Clubhouse Hub",
  },
  {
    name: "Suresh Reddy",
    email: "suresh@bycme.in",
    role: "Manager",
    detail: "Bengaluru • East Gate Hub",
  },
  {
    name: "Priya Nair",
    email: "priya@bycme.in",
    role: "Manager",
    detail: "Bengaluru • Sports Arena Hub",
  },
  {
    name: "Rahul Verma",
    email: "rahul@bycme.in",
    role: "Manager",
    detail: "Hyderabad • Podium Level Hub",
  },
  {
    name: "Kavita Sharma",
    email: "kavita@bycme.in",
    role: "Rider",
    detail: "Pune • Gate 1 Hub Rider",
  },
  {
    name: "Rahim Khan",
    email: "rahim@bycme.in",
    role: "Rider",
    detail: "Pune • Clubhouse Hub Rider",
  },
  {
    name: "Deepak Patel",
    email: "deepak@bycme.in",
    role: "Rider",
    detail: "Pune • Pending Transfer to Gate 1 Hub",
  },
  {
    name: "Rajesh Kumar",
    email: "rajesh@bycme.in",
    role: "Applicant",
    detail: "Bengaluru • Pending Request",
  },
];

export function LoginForm({ apiClient, onLoginSuccess, onCancel }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSeededMenu, setShowSeededMenu] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login({
        email: email.trim(),
        password,
      });
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg.replace(/^API Error \d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSeeded = (acc: SeededAccount) => {
    setEmail(acc.email);
    setPassword("Admin@Bycme2026");
    setError(null);
    setShowSeededMenu(false);
  };

  return (
    <div className="card" style={{ maxWidth: "440px", width: "100%", margin: "2rem auto" }}>
      <h2 style={{ marginBottom: "0.25rem", color: "var(--text-main)" }}>Sign In</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Enter credentials to access the Bycme workspace.
      </p>

      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@bycme.in"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In ➔"}
          </button>

          <div style={{ position: "relative", width: "100%" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowSeededMenu((prev) => !prev)}
              style={{
                fontSize: "0.85rem",
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>⚡ Quick Fill Seeded Account</span>
              <span style={{ fontSize: "0.75rem" }}>{showSeededMenu ? "▲" : "▼"}</span>
            </button>

            {showSeededMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--card-bg, #ffffff)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                  zIndex: 100,
                  maxHeight: "260px",
                  overflowY: "auto",
                  padding: "0.35rem",
                }}
              >
                <div
                  style={{
                    padding: "0.35rem 0.6rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    borderBottom: "1px solid var(--border-color)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Select a test account:
                </div>
                {SEEDED_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleSelectSeeded(acc)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      background: "transparent",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted, #f1f5f9)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>
                        {acc.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.1rem 0.35rem",
                          borderRadius: "4px",
                          background: acc.role === "Admin" ? "#fee2e2" : acc.role === "Manager" ? "#dbeafe" : "#fef3c7",
                          color: acc.role === "Admin" ? "#b91c1c" : acc.role === "Manager" ? "#1d4ed8" : "#b45309",
                        }}
                      >
                        {acc.role === "Admin" ? "ClubHero" : acc.role === "Manager" ? "HubHero" : acc.role}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      {acc.email} • {acc.detail}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="btn-text" onClick={onCancel}>
            ← Back to Landing Page
          </button>
        </div>
      </form>
    </div>
  );
}
