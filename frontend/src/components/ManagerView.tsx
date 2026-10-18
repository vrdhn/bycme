import React, { useState, useEffect } from "react";
import {
  BycmeClient,
  Parking,
  Cycle,
  Ride,
  ParkingMembership,
  CycleCondition,
  CycleConditionTrail,
} from "../../../generated/shared";
import { QrStickerModal } from "./QrStickerModal";

interface Props {
  client: BycmeClient;
  managerId: string;
}

export const ManagerView: React.FC<Props> = ({ client, managerId }) => {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParkingId, setSelectedParkingId] = useState<string>("");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [memberships, setMemberships] = useState<ParkingMembership[]>([]);

  // Add Cycle form
  const [newPublicId, setNewPublicId] = useState("");
  const [newMakeModel, setNewMakeModel] = useState("");

  // Condition change modal / state
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [newCondition, setNewCondition] = useState<CycleCondition>("Working");
  const [conditionNotes, setConditionNotes] = useState("");
  const [trails, setTrails] = useState<CycleConditionTrail[]>([]);

  // QR Sticker
  const [stickerCycle, setStickerCycle] = useState<Cycle | null>(null);

  // Invite creation
  const [generatedInvite, setGeneratedInvite] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");

  async function loadManagerParkings() {
    try {
      const prks = await client.listParkings(managerId);
      setParkings(prks);
      if (prks.length > 0) {
        const activeId = selectedParkingId || prks[0].id;
        setSelectedParkingId(activeId);
        await loadParkingDetails(activeId);
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error loading manager parkings");
    }
  }

  async function loadParkingDetails(pId: string) {
    try {
      const [cycs, rds, mems] = await Promise.all([
        client.listCycles(pId),
        client.listRides({ parkingId: pId }),
        client.listMemberships(pId),
      ]);
      setCycles(cycs);
      setRides(rds);
      setMemberships(mems);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error loading parking data");
    }
  }

  useEffect(() => {
    loadManagerParkings();
  }, [managerId]);

  function handleSelectParking(pId: string) {
    setSelectedParkingId(pId);
    loadParkingDetails(pId);
  }

  async function handleAddCycle(e: React.FormEvent) {
    e.preventDefault();
    if (!newPublicId.trim() || !newMakeModel.trim() || !selectedParkingId) return;
    try {
      await client.createCycle({
        parkingId: selectedParkingId,
        publicCycleId: newPublicId.trim().toUpperCase(),
        makeModel: newMakeModel.trim(),
      });
      setNewPublicId("");
      setNewMakeModel("");
      setFeedback("Cycle added successfully.");
      await loadParkingDetails(selectedParkingId);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to add cycle");
    }
  }

  async function openConditionModal(c: Cycle) {
    setEditingCycle(c);
    setNewCondition(c.condition);
    setConditionNotes("");
    try {
      const history = await client.getCycleTrails(c.id);
      setTrails(history);
    } catch {
      setTrails([]);
    }
  }

  async function handleSaveCondition(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCycle) return;
    try {
      await client.updateCycleCondition(editingCycle.id, {
        condition: newCondition,
        notes: conditionNotes,
      });
      setEditingCycle(null);
      setFeedback("Cycle condition updated.");
      await loadParkingDetails(selectedParkingId);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to update condition");
    }
  }

  async function handleGenerateInvitation() {
    if (!selectedParkingId) return;
    try {
      const inv = await client.createInvitation({ parkingId: selectedParkingId }, managerId);
      setGeneratedInvite(inv.code);
      setFeedback(`Generated invitation code: ${inv.code}`);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to generate invitation");
    }
  }

  async function handleReviewMembership(id: string, status: "approved" | "disapproved") {
    try {
      await client.updateMembership(id, { status });
      setFeedback(`Request ${status}.`);
      await loadParkingDetails(selectedParkingId);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to update request");
    }
  }

  if (parkings.length === 0) {
    return (
      <div className="view-container">
        <h2>Manager Dashboard</h2>
        <div className="card">
          <p className="text-muted">You are not currently assigned to manage any parkings. Please ask an Admin to assign you to a parking hub.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Manager Console</h2>
        <div className="parking-picker">
          <label><strong>Managed Parking:</strong> </label>
          <select value={selectedParkingId} onChange={(e) => handleSelectParking(e.target.value)}>
            {parkings.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (Cap: {p.capacity})</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => loadParkingDetails(selectedParkingId)}>Refresh</button>
        </div>
      </div>

      {feedback && <div className="banner-info">{feedback}</div>}

      <div className="grid-two-col">
        {/* Add Cycle */}
        <div className="card">
          <h3>Register New Cycle</h3>
          <form onSubmit={handleAddCycle} className="form-stack">
            <label>
              Public Cycle Identifier:
              <input
                type="text"
                placeholder="e.g. CYC-105"
                value={newPublicId}
                onChange={(e) => setNewPublicId(e.target.value)}
                required
              />
            </label>
            <label>
              Make / Model:
              <input
                type="text"
                placeholder="e.g. Specialized Sirrus X / Matte Black"
                value={newMakeModel}
                onChange={(e) => setNewMakeModel(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn-primary">Add Cycle to Stand</button>
          </form>
        </div>

        {/* Generate Invitation */}
        <div className="card">
          <h3>Rider Invitation Link Generator</h3>
          <p className="text-muted">Generate unique codes for residents or riders to join this parking stand.</p>
          <button className="btn-primary" onClick={handleGenerateInvitation}>Generate Invitation Code</button>
          {generatedInvite && (
            <div className="invite-box">
              <span className="invite-label">Active Invite Code:</span>
              <strong className="invite-code">{generatedInvite}</strong>
              <div className="sub-text">Share this code with riders to register at the invitation page.</div>
            </div>
          )}
        </div>
      </div>

      {/* Membership / Join Requests */}
      <div className="card">
        <h3>Pending & Approved Join Requests ({memberships.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Email</th>
              <th>Status</th>
              <th>Applied At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {memberships.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-muted">No join requests for this parking stand.</td></tr>
            ) : (
              memberships.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.personName || m.personId}</strong></td>
                  <td>{m.personEmail || "-"}</td>
                  <td>
                    <span className={`badge badge-req-${m.status}`}>{m.status}</span>
                  </td>
                  <td>{new Date(m.createdAt).toLocaleString()}</td>
                  <td>
                    {m.status === "pending" ? (
                      <div className="action-buttons">
                        <button className="btn-tiny btn-success" onClick={() => handleReviewMembership(m.id, "approved")}>Approve</button>
                        <button className="btn-tiny btn-danger" onClick={() => handleReviewMembership(m.id, "disapproved")}>Disapprove</button>
                      </div>
                    ) : (
                      <span className="text-muted">Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cycles in this Parking */}
      <div className="card">
        <h3>Cycles in this Parking ({cycles.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Public ID</th>
              <th>Model</th>
              <th>QR Code Payload</th>
              <th>Condition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.publicCycleId}</strong></td>
                <td>{c.makeModel}</td>
                <td><code>{c.qrCode}</code></td>
                <td>
                  <span className={`badge badge-cond-${c.condition.toLowerCase()}`}>
                    {c.condition}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-tiny" onClick={() => openConditionModal(c)}>
                      Change Condition
                    </button>
                    <button className="btn-tiny btn-accent" onClick={() => setStickerCycle(c)}>
                      Print Sticker
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rides in this Parking */}
      <div className="card">
        <h3>Parking Rides ({rides.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ride ID</th>
              <th>Cycle ID</th>
              <th>Rider ID</th>
              <th>Status</th>
              <th>Started</th>
              <th>Finished</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((r) => (
              <tr key={r.id}>
                <td><code>{r.id}</code></td>
                <td>{r.cycleId}</td>
                <td>{r.riderId}</td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                <td>{new Date(r.startTime).toLocaleString()}</td>
                <td>{r.endTime ? new Date(r.endTime).toLocaleString() : "-"}</td>
                <td>{r.checkinNotes || r.checkoutNotes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Condition Change Modal */}
      {editingCycle && (
        <div className="modal-backdrop" onClick={() => setEditingCycle(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Change Condition: {editingCycle.publicCycleId}</h3>
            <p className="sub-text">{editingCycle.makeModel}</p>
            <form onSubmit={handleSaveCondition} className="form-stack">
              <label>
                Condition Status:
                <select value={newCondition} onChange={(e) => setNewCondition(e.target.value as CycleCondition)}>
                  <option value="Working">Working</option>
                  <option value="Broken">Broken</option>
                  <option value="Puncture">Puncture</option>
                </select>
              </label>
              <label>
                Notes on Condition Change:
                <textarea
                  rows={3}
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="e.g. Rear tube replaced, brake aligned..."
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save Condition Change</button>
                <button type="button" className="btn-secondary" onClick={() => setEditingCycle(null)}>Cancel</button>
              </div>
            </form>

            <div className="trail-history">
              <h4>Condition Audit Trail</h4>
              {trails.length === 0 ? (
                <p className="text-muted">No condition changes recorded yet.</p>
              ) : (
                <ul className="trail-list">
                  {trails.map((t) => (
                    <li key={t.id}>
                      <span className="badge badge-tiny">{t.fromCondition} → {t.toCondition}</span>
                      <span className="notes">{t.notes}</span>
                      <span className="timestamp">{new Date(t.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Sticker Print Modal */}
      <QrStickerModal cycle={stickerCycle} onClose={() => setStickerCycle(null)} />
    </div>
  );
};
