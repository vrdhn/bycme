import { useEffect, useState, useCallback } from "react";
import { BycmeClient } from "../../../generated/shared";

type ThemeMode = "system" | "light" | "dark";

interface StatusBarProps {
  apiClient: BycmeClient;
  onBrandClick?: () => void;
}

export function StatusBar({ apiClient, onBrandClick }: StatusBarProps) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  const checkHealth = useCallback(async () => {
    try {
      const res = await apiClient.getHealth();
      setIsHealthy(res.status === "healthy");
    } catch {
      setIsHealthy(false);
    }
  }, [apiClient]);

  const applyTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("bycme-theme", mode);
    if (mode === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (mode === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  const cycleTheme = useCallback(() => {
    if (themeMode === "system") {
      applyTheme("light");
    } else if (themeMode === "light") {
      applyTheme("dark");
    } else {
      applyTheme("system");
    }
  }, [themeMode, applyTheme]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("bycme-theme") as ThemeMode | null;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      applyTheme(savedTheme);
    } else {
      applyTheme("system");
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth, applyTheme]);

  const getThemeDetails = () => {
    if (themeMode === "system") return { icon: "💻", text: "Auto" };
    if (themeMode === "light") return { icon: "☀️", text: "Light" };
    return { icon: "🌙", text: "Dark" };
  };

  const themeDetails = getThemeDetails();

  return (
    <header className="status-bar">
      <div className="status-inner">
        <span className="brand-title" onClick={onBrandClick} role="button" tabIndex={0}>
          <span>🚲</span> Bycme
        </span>

        <div className="status-right">
          <button
            className="theme-toggle-btn"
            onClick={cycleTheme}
            title={`Theme mode: ${themeMode.toUpperCase()} (Click to toggle)`}
            aria-label="Toggle color theme"
          >
            <span className="theme-icon">{themeDetails.icon}</span>
            <span className="theme-text">{themeDetails.text}</span>
          </button>

          <div
            className="indicator-group"
            title={
              isHealthy === null
                ? "Checking API health..."
                : isHealthy
                  ? "Backend connected"
                  : "Backend unreachable"
            }
          >
            <span
              className={`status-dot ${
                isHealthy === true
                  ? "healthy"
                  : isHealthy === false
                    ? "unhealthy"
                    : "checking"
              }`}
            />
            <span className="status-label">
              {isHealthy === true
                ? "Online"
                : isHealthy === false
                  ? "Offline"
                  : "Connecting..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
