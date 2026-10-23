import { useState } from "react";
import { BycmeClient, Person } from "../../../generated/shared";

interface LoginFormProps {
  apiClient: BycmeClient;
  onLoginSuccess: (token: string, user: Person) => void;
  onCancel: () => void;
}

export function LoginForm({ apiClient, onLoginSuccess, onCancel }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleFillAdmin = () => {
    setEmail("admin@bycme.in");
    setPassword("Admin@Bycme2026");
    setError(null);
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

          <button
            type="button"
            className="btn-secondary"
            onClick={handleFillAdmin}
            style={{ fontSize: "0.85rem" }}
          >
            ⚡ Use Seeded Admin Credentials
          </button>

          <button type="button" className="btn-text" onClick={onCancel}>
            ← Back to Landing Page
          </button>
        </div>
      </form>
    </div>
  );
}
