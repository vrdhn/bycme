import React, { useState, useEffect } from "react";
import {
  BycmeClient,
  Cycle,
  Ride,
  Parking,
  CycleCondition,
} from "../../../generated/shared";

interface Props {
  client: BycmeClient;
  riderId: string;
}

export const RiderView: React.FC<Props> = ({ client, riderId }) => {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParkingId, setSelectedParkingId] = useState<string>("");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [pastRides, setPastRides] = useState<Ride[]>([]);

  // Checkout modal
  const [checkoutCycle, setCheckoutCycle] = useState<Cycle | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState("");

  // Checkin modal
  const [checkinNotes, setCheckinNotes] = useState("");
  const [conditionChange, setConditionChange] = useState<CycleCondition | "">("");

  const [feedback, setFeedback] = useState<string>("");

  async function loadRiderData() {
    try {
      const [allParkings, allRiderRides] = await Promise.all([
        client.listParkings(),
        client.listRides({ riderId }),
      ]);

      setParkings(allParkings);
      if (allParkings.length > 0 && !selectedParkingId) {
        setSelectedParkingId(allParkings[0].id);
        await loadCyclesForParking(allParkings[0].id);
      } else if (selectedParkingId) {
        await loadCyclesForParking(selectedParkingId);
      }

      const active = allRiderRides.find((r) => r.status === "active") || null;
      setActiveRide(active);
      setPastRides(allRiderRides.filter((r) => r.status === "finished"));
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error loading rider data");
    }
  }

  async function loadCyclesForParking(pId: string) {
    try {
      const cycs = await client.listCycles(pId);
      setCycles(cycs);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error loading cycles");
    }
  }

  useEffect(() => {
    loadRiderData();
  }, [riderId]);

  function handleSelectParking(pId: string) {
    setSelectedParkingId(pId);
    loadCyclesForParking(pId);
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutCycle) return;
    try {
      await client.checkoutCycle(
        {
          cycleId: checkoutCycle.id,
          checkoutNotes,
        },
        riderId
      );
      setCheckoutCycle(null);
      setCheckoutNotes("");
      setFeedback(`Successfully checked out cycle ${checkoutCycle.publicCycleId}!`);
      await loadRiderData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRide) return;
    try {
      await client.checkinCycle(
        activeRide.id,
        {
          checkinNotes,
          conditionChange: conditionChange ? conditionChange : undefined,
        },
        riderId
      );
      setCheckinNotes("");
      setConditionChange("");
      setFeedback("Cycle checked in successfully. Ride finished!");
      await loadRiderData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Checkin failed");
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Rider Station</h2>
        <button className="btn-secondary" onClick={loadRiderData}>Refresh</button>
      </div>

      {feedback && <div className="banner-info">{feedback}</div>}

      {/* Active Ride Banner */}
      {activeRide ? (
        <div className="card active-ride-card">
          <div className="active-ride-header">
            <h3>🚲 You Have an Active Ride!</h3>
            <span className="badge badge-active">Active</span>
          </div>
          <p>
            Cycle ID: <strong>{activeRide.cycleId}</strong> | Started at:{" "}
            {new Date(activeRide.startTime).toLocaleTimeString()}
          </p>

          <form onSubmit={handleCheckin} className="form-stack checkin-form">
            <h4>Check in Cycle & Return</h4>
            <label>
              Ride Notes / Remarks:
              <input
                type="text"
                placeholder="e.g. Smooth ride, no issues"
                value={checkinNotes}
                onChange={(e) => setCheckinNotes(e.target.value)}
              />
            </label>
            <label>
              Report Condition Change (if issue occurred):
              <select
                value={conditionChange}
                onChange={(e) => setConditionChange(e.target.value as CycleCondition)}
              >
                <option value="">Keep Condition as is</option>
                <option value="Broken">Flag as Broken</option>
                <option value="Puncture">Flag as Puncture</option>
                <option value="Working">Flag as Working</option>
              </select>
            </label>
            <button type="submit" className="btn-primary btn-large">Check In & Finish Ride</button>
          </form>
        </div>
      ) : (
        <div className="card ready-banner">
          <p>✓ You have no active ride. Select a working cycle below to begin a trip (only 1 active ride at a time).</p>
        </div>
      )}

      {/* Available Cycles by Parking */}
      <div className="card">
        <div className="card-header-flex">
          <h3>Available Cycles</h3>
          <div className="parking-filter">
            <label>Parking Stand: </label>
            <select value={selectedParkingId} onChange={(e) => handleSelectParking(e.target.value)}>
              {parkings.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Cycle ID</th>
              <th>Make & Model</th>
              <th>Condition</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cycles.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-muted">No cycles at this parking stand.</td></tr>
            ) : (
              cycles.map((c) => {
                const canCheckout = c.condition === "Working" && !activeRide;
                return (
                  <tr key={c.id}>
                    <td><strong>{c.publicCycleId}</strong></td>
                    <td>{c.makeModel}</td>
                    <td>
                      <span className={`badge badge-cond-${c.condition.toLowerCase()}`}>
                        {c.condition}
                      </span>
                    </td>
                    <td>
                      {canCheckout ? (
                        <button
                          className="btn-tiny btn-primary"
                          onClick={() => setCheckoutCycle(c)}
                        >
                          Unlock & Checkout
                        </button>
                      ) : (
                        <span className="text-muted">
                          {activeRide ? "Ride in progress" : "Unavailable"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Past Rides Table */}
      <div className="card">
        <h3>My Ride History ({pastRides.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ride ID</th>
              <th>Cycle</th>
              <th>Started</th>
              <th>Finished</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {pastRides.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-muted">No completed rides yet.</td></tr>
            ) : (
              pastRides.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>{r.cycleId}</td>
                  <td>{new Date(r.startTime).toLocaleString()}</td>
                  <td>{r.endTime ? new Date(r.endTime).toLocaleString() : "-"}</td>
                  <td>{r.checkinNotes || r.checkoutNotes || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Checkout Modal */}
      {checkoutCycle && (
        <div className="modal-backdrop" onClick={() => setCheckoutCycle(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Unlock Cycle: {checkoutCycle.publicCycleId}</h3>
            <p className="sub-text">{checkoutCycle.makeModel}</p>
            <form onSubmit={handleCheckout} className="form-stack">
              <label>
                Departure Remarks (Optional):
                <input
                  type="text"
                  placeholder="e.g. Commute to West Gate..."
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Confirm & Start Ride</button>
                <button type="button" className="btn-secondary" onClick={() => setCheckoutCycle(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
