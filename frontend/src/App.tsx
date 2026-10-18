import { useState, useEffect } from "react";
import { BycmeClient, HealthStatus } from "../../generated/shared";

const API_BASE = "https://bycme-staging.bycme-backend.workers.dev";
const client = new BycmeClient(API_BASE);

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    client.getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Bycme Cycle Sharing</h1>
      <p>System status: {health ? health.status : "Connecting..."}</p>
    </div>
  );
}
