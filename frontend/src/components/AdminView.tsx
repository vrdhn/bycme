import React, { useState, useEffect } from "react";
import {
  BycmeClient,
  Building,
  Parking,
  Person,
  Cycle,
  Ride,
  BuildingType,
  PersonRole,
} from "../../../generated/shared";

interface Props {
  client: BycmeClient;
}

export const AdminView: React.FC<Props> = ({ client }) => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);

  const [bldName, setBldName] = useState("");
  const [bldType, setBldType] = useState<BuildingType>("Private");

  const [prkBuildingId, setPrkBuildingId] = useState("");
  const [prkName, setPrkName] = useState("");
  const [prkCapacity, setPrkCapacity] = useState(10);
  const [prkManagerId, setPrkManagerId] = useState("");

  const [feedback, setFeedback] = useState<string>("");

  async function refreshData() {
    try {
      const [blds, prks, psns, cycs, rds] = await Promise.all([
        client.listBuildings(),
        client.listParkings(),
        client.listPersons(),
        client.listCycles(),
        client.listRides(),
      ]);
      setBuildings(blds);
      setParkings(prks);
      setPersons(psns);
      setCycles(cycs);
      setRides(rds);
      if (blds.length > 0 && !prkBuildingId) {
        setPrkBuildingId(blds[0].id);
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error refreshing admin data");
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  async function handleCreateBuilding(e: React.FormEvent) {
    e.preventDefault();
    if (!bldName.trim()) return;
    try {
      await client.createBuilding({ name: bldName.trim(), buildingType: bldType });
      setBldName("");
      setFeedback("Building created successfully.");
      await refreshData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to create building");
    }
  }

  async function handleCreateParking(e: React.FormEvent) {
    e.preventDefault();
    if (!prkName.trim() || !prkBuildingId) return;
    try {
      await client.createParking({
        buildingId: prkBuildingId,
        name: prkName.trim(),
        capacity: Number(prkCapacity),
        managerIds: prkManagerId ? [prkManagerId] : [],
      });
      setPrkName("");
      setPrkManagerId("");
      setFeedback("Parking created successfully.");
      await refreshData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to create parking");
    }
  }

  async function handleToggleRole(person: Person, roleToToggle: PersonRole) {
    const hasRole = person.roles.includes(roleToToggle);
    const updatedRoles = hasRole
      ? person.roles.filter((r) => r !== roleToToggle)
      : [...person.roles, roleToToggle];
    try {
      await client.updatePersonRoles(person.id, { roles: updatedRoles });
      setFeedback(`Updated roles for ${person.name}.`);
      await refreshData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to update roles");
    }
  }

  async function handleAssignManager(parkingId: string, managerId: string) {
    const parking = parkings.find((p) => p.id === parkingId);
    if (!parking) return;
    const isAssigned = parking.managerIds.includes(managerId);
    const updatedManagers = isAssigned
      ? parking.managerIds.filter((id) => id !== managerId)
      : [...parking.managerIds, managerId];
    try {
      await client.updateParkingManagers(parkingId, { managerIds: updatedManagers });
      setFeedback(`Updated manager assignments for ${parking.name}.`);
      await refreshData();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to update parking managers");
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Admin Management Console</h2>
        <button className="btn-secondary" onClick={refreshData}>Refresh</button>
      </div>

      {feedback && <div className="banner-info">{feedback}</div>}

      <div className="grid-two-col">
        {/* Create Building */}
        <div className="card">
          <h3>Add Building</h3>
          <form onSubmit={handleCreateBuilding} className="form-stack">
            <label>
              Building Name:
              <input
                type="text"
                value={bldName}
                onChange={(e) => setBldName(e.target.value)}
                placeholder="e.g. Phoenix Innovation Tower"
                required
              />
            </label>
            <label>
              Building Type:
              <select value={bldType} onChange={(e) => setBldType(e.target.value as BuildingType)}>
                <option value="Private">Private</option>
                <option value="Public">Public</option>
              </select>
            </label>
            <button type="submit" className="btn-primary">Create Building</button>
          </form>
        </div>

        {/* Create Parking */}
        <div className="card">
          <h3>Add Parking Hub</h3>
          <form onSubmit={handleCreateParking} className="form-stack">
            <label>
              Building:
              <select
                value={prkBuildingId}
                onChange={(e) => setPrkBuildingId(e.target.value)}
                required
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.buildingType})</option>
                ))}
              </select>
            </label>
            <label>
              Parking Name:
              <input
                type="text"
                value={prkName}
                onChange={(e) => setPrkName(e.target.value)}
                placeholder="e.g. West Entrance Stand"
                required
              />
            </label>
            <label>
              Capacity (Cycles):
              <input
                type="number"
                min="1"
                value={prkCapacity}
                onChange={(e) => setPrkCapacity(Number(e.target.value))}
                required
              />
            </label>
            <label>
              Initial Manager (Optional):
              <select
                value={prkManagerId}
                onChange={(e) => setPrkManagerId(e.target.value)}
              >
                <option value="">None</option>
                {persons.filter((p) => p.roles.includes("Manager")).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary">Create Parking</button>
          </form>
        </div>
      </div>

      {/* Buildings & Parkings List */}
      <div className="card">
        <h3>Parkings & Assigned Managers</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Parking</th>
              <th>Building</th>
              <th>Capacity</th>
              <th>Assigned Managers</th>
              <th>Assign/Unassign Manager</th>
            </tr>
          </thead>
          <tbody>
            {parkings.map((p) => {
              const bld = buildings.find((b) => b.id === p.buildingId);
              const managers = persons.filter((m) => p.managerIds.includes(m.id));
              return (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{bld ? bld.name : p.buildingId}</td>
                  <td>{p.capacity}</td>
                  <td>
                    {managers.length > 0
                      ? managers.map((m) => m.name).join(", ")
                      : <span className="text-muted">No manager assigned</span>}
                  </td>
                  <td>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleAssignManager(p.id, e.target.value);
                      }}
                    >
                      <option value="">Toggle Manager...</option>
                      {persons.filter((ps) => ps.roles.includes("Manager")).map((m) => (
                        <option key={m.id} value={m.id}>
                          {p.managerIds.includes(m.id) ? `✓ Remove ${m.name}` : `+ Add ${m.name}`}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Account Roles Management */}
      <div className="card">
        <h3>Account Roles & Permissions</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Current Roles</th>
              <th>Toggle Role</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td>
                <td>{p.email}</td>
                <td>
                  <div className="tag-group">
                    {p.roles.map((r) => (
                      <span key={r} className={`badge badge-${r.toLowerCase()}`}>{r}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-tiny"
                      onClick={() => handleToggleRole(p, "Manager")}
                    >
                      {p.roles.includes("Manager") ? "Revoke Manager" : "Grant Manager"}
                    </button>
                    <button
                      className="btn-tiny"
                      onClick={() => handleToggleRole(p, "Rider")}
                    >
                      {p.roles.includes("Rider") ? "Revoke Rider" : "Grant Rider"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Global Cycles Table */}
      <div className="card">
        <h3>All Cycles ({cycles.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Public ID</th>
              <th>Make & Model</th>
              <th>QR Code</th>
              <th>Parking</th>
              <th>Condition</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => {
              const prk = parkings.find((p) => p.id === c.parkingId);
              return (
                <tr key={c.id}>
                  <td><strong>{c.publicCycleId}</strong></td>
                  <td>{c.makeModel}</td>
                  <td><code>{c.qrCode}</code></td>
                  <td>{prk ? prk.name : c.parkingId}</td>
                  <td>
                    <span className={`badge badge-cond-${c.condition.toLowerCase()}`}>
                      {c.condition}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Global Rides Table */}
      <div className="card">
        <h3>All Rides ({rides.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ride ID</th>
              <th>Cycle</th>
              <th>Rider</th>
              <th>Parking</th>
              <th>Status</th>
              <th>Started</th>
              <th>Finished</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((r) => {
              const cyc = cycles.find((c) => c.id === r.cycleId);
              const rider = persons.find((p) => p.id === r.riderId);
              const prk = parkings.find((p) => p.id === r.parkingId);
              return (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td>{cyc ? cyc.publicCycleId : r.cycleId}</td>
                  <td>{rider ? rider.name : r.riderId}</td>
                  <td>{prk ? prk.name : r.parkingId}</td>
                  <td>
                    <span className={`badge badge-${r.status}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{new Date(r.startTime).toLocaleString()}</td>
                  <td>{r.endTime ? new Date(r.endTime).toLocaleString() : "-"}</td>
                  <td>
                    {r.checkinNotes ? `Checkin: ${r.checkinNotes}` : r.checkoutNotes || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
