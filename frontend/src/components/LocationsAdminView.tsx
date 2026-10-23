import { useState, useEffect, useCallback } from "react";
import {
  BycmeClient,
  City,
  Building,
  Parking,
  BuildingType,
} from "../../../generated/shared";
import { ManagerInviteModal } from "./ManagerInviteModal";

interface LocationsAdminViewProps {
  apiClient: BycmeClient;
  token: string;
}

export function LocationsAdminView({ apiClient, token }: LocationsAdminViewProps) {
  const [activeTab, setActiveTab] = useState<"cities" | "buildings" | "parkings">("cities");

  const [cities, setCities] = useState<City[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParkingForInvite, setSelectedParkingForInvite] = useState<Parking | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New item form states
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");

  const [newBldCityId, setNewBldCityId] = useState("");
  const [newBldName, setNewBldName] = useState("");
  const [newBldType, setNewBldType] = useState<BuildingType>("Private");

  const [newPrkBldId, setNewPrkBldId] = useState("");
  const [newPrkName, setNewPrkName] = useState("");
  const [newPrkCapacity, setNewPrkCapacity] = useState(10);

  // Inline edit states
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editCityName, setEditCityName] = useState("");
  const [editCityState, setEditCityState] = useState("");

  const [editingBldId, setEditingBldId] = useState<string | null>(null);
  const [editBldCityId, setEditBldCityId] = useState("");
  const [editBldName, setEditBldName] = useState("");
  const [editBldType, setEditBldType] = useState<BuildingType>("Private");

  const [editingPrkId, setEditingPrkId] = useState<string | null>(null);
  const [editPrkBldId, setEditPrkBldId] = useState("");
  const [editPrkName, setEditPrkName] = useState("");
  const [editPrkCapacity, setEditPrkCapacity] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cList, bList, pList] = await Promise.all([
        apiClient.listCities(token),
        apiClient.listBuildings(undefined, token),
        apiClient.listParkings(undefined, token),
      ]);
      setCities(cList);
      setBuildings(bList);
      setParkings(pList);

      if (cList.length > 0 && !newBldCityId) {
        setNewBldCityId(cList[0].id);
      }
      if (bList.length > 0 && !newPrkBldId) {
        setNewPrkBldId(bList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load location data");
    } finally {
      setLoading(false);
    }
  }, [apiClient, token, newBldCityId, newPrkBldId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for City
  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim() || !newCityState.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      const created = await apiClient.createCity(
        { name: newCityName.trim(), state: newCityState.trim() },
        token
      );
      setCities((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCityName("");
      setNewCityState("");
      setSuccess(`City "${created.name}" created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create city");
    }
  };

  const startEditCity = (city: City) => {
    setEditingCityId(city.id);
    setEditCityName(city.name);
    setEditCityState(city.state);
  };

  const handleSaveCity = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiClient.updateCity(
        id,
        { name: editCityName.trim(), state: editCityState.trim() },
        token
      );
      setCities((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingCityId(null);
      setSuccess(`City updated successfully to "${updated.name}".`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update city");
    }
  };

  // Handlers for Building
  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBldName.trim() || !newBldCityId) return;
    setError(null);
    setSuccess(null);
    try {
      const created = await apiClient.createBuilding(
        { cityId: newBldCityId, name: newBldName.trim(), buildingType: newBldType },
        token
      );
      setBuildings((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewBldName("");
      setSuccess(`Building "${created.name}" created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create building");
    }
  };

  const startEditBuilding = (b: Building) => {
    setEditingBldId(b.id);
    setEditBldName(b.name);
    setEditBldCityId(b.cityId);
    setEditBldType(b.buildingType);
  };

  const handleSaveBuilding = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiClient.updateBuilding(
        id,
        { name: editBldName.trim(), cityId: editBldCityId, buildingType: editBldType },
        token
      );
      setBuildings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setEditingBldId(null);
      setSuccess(`Building updated successfully to "${updated.name}".`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update building");
    }
  };

  // Handlers for Parking
  const handleCreateParking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrkName.trim() || !newPrkBldId) return;
    setError(null);
    setSuccess(null);
    try {
      const created = await apiClient.createParking(
        { buildingId: newPrkBldId, name: newPrkName.trim(), capacity: Number(newPrkCapacity) },
        token
      );
      setParkings((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPrkName("");
      setSuccess(`Parking stand "${created.name}" created successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create parking stand");
    }
  };

  const startEditParking = (p: Parking) => {
    setEditingPrkId(p.id);
    setEditPrkName(p.name);
    setEditPrkBldId(p.buildingId);
    setEditPrkCapacity(p.capacity);
  };

  const handleSaveParking = async (id: string) => {
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiClient.updateParking(
        id,
        { name: editPrkName.trim(), buildingId: editPrkBldId, capacity: Number(editPrkCapacity) },
        token
      );
      setParkings((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingPrkId(null);
      setSuccess(`Parking stand updated successfully to "${updated.name}".`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update parking stand");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Subtabs bar */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
        <button
          className={activeTab === "cities" ? "btn-primary" : "btn-secondary"}
          style={{ width: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
          onClick={() => setActiveTab("cities")}
        >
          🏙️ Cities ({cities.length})
        </button>
        <button
          className={activeTab === "buildings" ? "btn-primary" : "btn-secondary"}
          style={{ width: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
          onClick={() => setActiveTab("buildings")}
        >
          🏢 Buildings ({buildings.length})
        </button>
        <button
          className={activeTab === "parkings" ? "btn-primary" : "btn-secondary"}
          style={{ width: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
          onClick={() => setActiveTab("parkings")}
        >
          🅿️ Parkings ({parkings.length})
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {success && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem" }}>
          {success}
        </div>
      )}

      {/* CITIES TAB */}
      {activeTab === "cities" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
          <div className="card">
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--text-main)" }}>Add New City</h3>
            <form onSubmit={handleCreateCity}>
              <div className="form-group">
                <label className="form-label">City Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Chennai"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">State / Region</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCityState}
                  onChange={(e) => setNewCityState(e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "0.5rem" }}>
                Add City
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>Configured Cities</h3>
            {loading ? (
              <p style={{ color: "var(--text-muted)" }}>Loading...</p>
            ) : cities.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No cities configured yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>City</th>
                    <th>State</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((c) => (
                    <tr key={c.id}>
                      {editingCityId === c.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={editCityName}
                              onChange={(e) => setEditCityName(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={editCityState}
                              onChange={(e) => setEditCityState(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              className="btn-text"
                              style={{ color: "#15803d", fontWeight: 700 }}
                              onClick={() => handleSaveCity(c.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn-text"
                              style={{ color: "var(--text-muted)" }}
                              onClick={() => setEditingCityId(null)}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{c.state}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn-text"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                              onClick={() => startEditCity(c)}
                              title="Edit City spelling/state"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* BUILDINGS TAB */}
      {activeTab === "buildings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
          <div className="card">
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--text-main)" }}>Add New Building</h3>
            <form onSubmit={handleCreateBuilding}>
              <div className="form-group">
                <label className="form-label">City</label>
                <select
                  className="form-input"
                  value={newBldCityId}
                  onChange={(e) => setNewBldCityId(e.target.value)}
                  required
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Building Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newBldName}
                  onChange={(e) => setNewBldName(e.target.value)}
                  placeholder="e.g. Prestige Tech Cloud"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Building Type</label>
                <select
                  className="form-input"
                  value={newBldType}
                  onChange={(e) => setNewBldType(e.target.value as BuildingType)}
                >
                  <option value="Private">Private (Residential)</option>
                  <option value="Public">Public (Campus / Office / Transit)</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: "0.5rem" }}
                disabled={cities.length === 0}
              >
                Add Building
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>Configured Buildings</h3>
            {loading ? (
              <p style={{ color: "var(--text-muted)" }}>Loading...</p>
            ) : buildings.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No buildings configured yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Building</th>
                    <th>City</th>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((b) => (
                    <tr key={b.id}>
                      {editingBldId === b.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={editBldName}
                              onChange={(e) => setEditBldName(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          </td>
                          <td>
                            <select
                              className="form-input"
                              value={editBldCityId}
                              onChange={(e) => setEditBldCityId(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            >
                              {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="form-input"
                              value={editBldType}
                              onChange={(e) => setEditBldType(e.target.value as BuildingType)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            >
                              <option value="Private">Private (Residential)</option>
                              <option value="Public">Public (Campus / Office / Transit)</option>
                            </select>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              className="btn-text"
                              style={{ color: "#15803d", fontWeight: 700 }}
                              onClick={() => handleSaveBuilding(b.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn-text"
                              style={{ color: "var(--text-muted)" }}
                              onClick={() => setEditingBldId(null)}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 600 }}>{b.name}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{b.cityName || "-"}</td>
                          <td>
                            <span
                              style={{
                                padding: "0.15rem 0.45rem",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: b.buildingType === "Private" ? "#fef3c7" : "#e0f2fe",
                                color: b.buildingType === "Private" ? "#b45309" : "#0369a1",
                              }}
                            >
                              {b.buildingType === "Private" ? "🏡 Private (Residential)" : "🏢 Public"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn-text"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                              onClick={() => startEditBuilding(b)}
                              title="Edit Building spelling/type"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* PARKINGS TAB */}
      {activeTab === "parkings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
          <div className="card">
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--text-main)" }}>Add New Parking Stand</h3>
            <form onSubmit={handleCreateParking}>
              <div className="form-group">
                <label className="form-label">Parent Building</label>
                <select
                  className="form-input"
                  value={newPrkBldId}
                  onChange={(e) => setNewPrkBldId(e.target.value)}
                  required
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.cityName || "Campus"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Parking Stand Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPrkName}
                  onChange={(e) => setNewPrkName(e.target.value)}
                  placeholder="e.g. Gate 1 Docking Hub"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cycle Capacity (Docks)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-input"
                  value={newPrkCapacity}
                  onChange={(e) => setNewPrkCapacity(Number(e.target.value))}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: "0.5rem" }}
                disabled={buildings.length === 0}
              >
                Add Parking Stand
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>Configured Parking Stands</h3>
            {loading ? (
              <p style={{ color: "var(--text-muted)" }}>Loading...</p>
            ) : parkings.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No parking stands configured yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parking Stand</th>
                    <th>Building / City</th>
                    <th>Capacity</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parkings.map((p) => (
                    <tr key={p.id}>
                      {editingPrkId === p.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={editPrkName}
                              onChange={(e) => setEditPrkName(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          </td>
                          <td>
                            <select
                              className="form-input"
                              value={editPrkBldId}
                              onChange={(e) => setEditPrkBldId(e.target.value)}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            >
                              {buildings.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              className="form-input"
                              value={editPrkCapacity}
                              onChange={(e) => setEditPrkCapacity(Number(e.target.value))}
                              style={{ width: "80px", padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            />
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <button
                              className="btn-text"
                              style={{ color: "#15803d", fontWeight: 700 }}
                              onClick={() => handleSaveParking(p.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn-text"
                              style={{ color: "var(--text-muted)" }}
                              onClick={() => setEditingPrkId(null)}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            <div>
                              <span>{p.buildingName || "-"}</span>
                              {p.cityName ? <span style={{ fontSize: "0.85rem", opacity: 0.8 }}> ({p.cityName})</span> : null}
                            </div>
                            <div style={{ marginTop: "0.2rem" }}>
                              <span
                                style={{
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "4px",
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  background: p.buildingType === "Private" ? "#fef3c7" : "#f1f5f9",
                                  color: p.buildingType === "Private" ? "#b45309" : "#475569",
                                }}
                              >
                                {p.buildingType === "Private" ? "🏡 Private (Residential)" : "🏢 Public"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>
                              {p.capacity} docks
                            </span>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            {p.buildingType === "Private" ? (
                              <button
                                className="btn-text"
                                style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", marginRight: "0.25rem", color: "var(--primary-color)", fontWeight: 600 }}
                                onClick={() => setSelectedParkingForInvite(p)}
                                title="Generate manager invitation link"
                              >
                                🔑 Invite
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  marginRight: "0.5rem",
                                  fontStyle: "italic",
                                }}
                                title="Public parkings cannot have a manager"
                              >
                                No Manager (Public)
                              </span>
                            )}
                            <button
                              className="btn-text"
                              style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                              onClick={() => startEditParking(p)}
                              title="Edit Parking stand spelling/capacity"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {selectedParkingForInvite && (
        <ManagerInviteModal
          apiClient={apiClient}
          parking={selectedParkingForInvite}
          token={token}
          onClose={() => setSelectedParkingForInvite(null)}
        />
      )}
    </div>
  );
}
