import { useState, useEffect } from "react";
import { Station, Bike, Ride, BycmeClient } from "../../shared";

const API_BASE = "https://bycme-staging.bycme-backend.workers.dev";
const client = new BycmeClient(API_BASE);

export default function App() {
  const [stations, setStations] = useState<Station[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>("Loading...");
  const [userId] = useState<string>("user-demo-1");

  async function loadData() {
    try {
      setStatusMsg("Fetching stations and bikes...");
      const [stList, bkList, rdList] = await Promise.all([
        client.listStations().catch(() => []),
        client.listBikes().catch(() => []),
        client.listActiveRides().catch(() => []),
      ]);
      setStations(stList);
      setBikes(bkList);
      setActiveRides(rdList);
      setStatusMsg("Connected to Bycme Staging API");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setStatusMsg(`Error: ${msg}`);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleStartRide(bikeId: string) {
    try {
      setStatusMsg(`Starting ride for bike ${bikeId}...`);
      await client.startRide({ bikeId, userId });
      setStatusMsg("Ride started successfully!");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ride failed";
      setStatusMsg(`Error: ${msg}`);
    }
  }

  async function handleEndRide(rideId: string, endStationId: string) {
    try {
      setStatusMsg(`Ending ride ${rideId}...`);
      await client.endRide(rideId, { endStationId });
      setStatusMsg("Ride completed!");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "End ride failed";
      setStatusMsg(`Error: ${msg}`);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🚲 Bycme Bike Sharing</h1>
        <p className="subtitle">Staging Environment Dashboard</p>
        <div className="status-badge">{statusMsg}</div>
      </header>

      <section className="section">
        <h2>Active Rides ({activeRides.length})</h2>
        {activeRides.length === 0 ? (
          <p className="empty-text">No active rides currently.</p>
        ) : (
          <div className="card-grid">
            {activeRides.map((ride) => (
              <div key={ride.id} className="card ride-card">
                <div><strong>Ride ID:</strong> {ride.id}</div>
                <div><strong>Bike:</strong> {ride.bikeId}</div>
                <div><strong>User:</strong> {ride.userId}</div>
                <div><strong>Started:</strong> {new Date(ride.startTime).toLocaleTimeString()}</div>
                <div className="actions">
                  <label>Return to: </label>
                  <select id={`end-station-${ride.id}`} defaultValue={stations[0]?.id}>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const sel = document.getElementById(`end-station-${ride.id}`) as HTMLSelectElement;
                      handleEndRide(ride.id, sel?.value || stations[0]?.id);
                    }}
                  >
                    End Ride
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Stations ({stations.length})</h2>
        <div className="card-grid">
          {stations.map((station) => (
            <div key={station.id} className="card">
              <h3>{station.name}</h3>
              <p>Available Bikes: <strong>{station.availableBikes}</strong> / {station.totalDocks}</p>
              <p className="meta">Lat: {station.latitude.toFixed(4)}, Lon: {station.longitude.toFixed(4)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Bikes ({bikes.length})</h2>
        <div className="card-grid">
          {bikes.map((bike) => (
            <div key={bike.id} className="card bike-card">
              <h3>{bike.id} ({bike.bikeModel})</h3>
              <p>Station: {bike.stationId}</p>
              <p>Battery: {bike.batteryLevel}%</p>
              <p>Status: <span className={`badge ${bike.status}`}>{bike.status}</span></p>
              {bike.status === "available" && (
                <button onClick={() => handleStartRide(bike.id)}>
                  Unlock & Start Ride
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
