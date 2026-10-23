import { useState, useEffect, useCallback } from "react";
import {
  BycmeClient,
  Parking,
  Cycle,
  CycleStatus,
} from "../../../generated/shared";

interface ManagerWorkspaceViewProps {
  apiClient: BycmeClient;
  token: string;
}

export function ManagerWorkspaceView({ apiClient, token }: ManagerWorkspaceViewProps) {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [selectedParkingId, setSelectedParkingId] = useState<string>("");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CycleStatus>("all");

  // Add Cycle Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPublicId, setAddPublicId] = useState("");
  const [addBrand, setAddBrand] = useState("");
  const [addModel, setAddModel] = useState("");
  const [addColour, setAddColour] = useState("");
  const [addStatus, setAddStatus] = useState<CycleStatus>("Working");
  const [addLockCode, setAddLockCode] = useState("");
  const [addQrCode, setAddQrCode] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Cycle Modal state
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [editStatus, setEditStatus] = useState<CycleStatus>("Working");
  const [editLockCode, setEditLockCode] = useState("");
  const [editQrCode, setEditQrCode] = useState("");
  const [editColour, setEditColour] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generateToken = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  // Load manager's assigned parkings
  const loadParkings = useCallback(async () => {
    try {
      const list = await apiClient.getMyManagedParkings(token);
      setParkings(list);
      if (list.length > 0 && !selectedParkingId) {
        setSelectedParkingId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load managed parkings");
    }
  }, [apiClient, token, selectedParkingId]);

  useEffect(() => {
    loadParkings();
  }, [loadParkings]);

  // Load cycles for selected parking
  const loadCycles = useCallback(async () => {
    if (!selectedParkingId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.listParkingCycles(selectedParkingId, token);
      setCycles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cycle inventory");
    } finally {
      setLoading(false);
    }
  }, [apiClient, selectedParkingId, token]);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  const handleOpenAdd = () => {
    setAddPublicId("");
    setAddBrand("");
    setAddModel("");
    setAddColour("");
    setAddStatus("Working");
    setAddLockCode("");
    setAddQrCode(generateToken());
    setModalError(null);
    setShowAddModal(true);
  };

  const handleAddCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParkingId) return;
    setModalLoading(true);
    setModalError(null);

    try {
      await apiClient.createCycle(
        selectedParkingId,
        {
          publicCycleId: addPublicId.trim().toUpperCase(),
          brand: addBrand.trim(),
          cycleModel: addModel.trim(),
          colour: addColour.trim(),
          status: addStatus,
          lockCode: addLockCode.trim(),
          qrCode: addQrCode.trim(),
        },
        token
      );
      setShowAddModal(false);
      setSuccessMsg(`Cycle ${addPublicId.trim().toUpperCase()} added successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadCycles();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to register cycle");
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setEditStatus(cycle.status);
    setEditLockCode(cycle.lockCode);
    setEditQrCode(cycle.qrCode);
    setEditColour(cycle.colour);
    setModalError(null);
  };

  const handleUpdateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCycle) return;
    setModalLoading(true);
    setModalError(null);

    try {
      await apiClient.updateCycle(
        editingCycle.id,
        {
          status: editStatus,
          lockCode: editLockCode.trim(),
          qrCode: editQrCode.trim(),
          colour: editColour.trim(),
        },
        token
      );
      setEditingCycle(null);
      setSuccessMsg(`Cycle ${editingCycle.publicCycleId} updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadCycles();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to update cycle");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  const selectedParking = parkings.find((p) => p.id === selectedParkingId);

  const filteredCycles = cycles.filter((c) => {
    const matchesSearch =
      c.publicCycleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cycleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.colour.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lockCode.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Station Selector & Utilization Card */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <label className="form-label">Active Parking Station</label>
            <select
              className="form-input"
              value={selectedParkingId}
              onChange={(e) => setSelectedParkingId(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {parkings.length === 0 ? (
                <option value="">No managed parking stands assigned</option>
              ) : (
                parkings.map((p) => (
                  <option key={p.id} value={p.id}>
                    📍 {p.name} ({p.buildingName || "Building"}, {p.cityName || "City"})
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedParking && (
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  background: "var(--card-bg-subtle)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Dock Utilization
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary-color)" }}>
                  {cycles.length} / {selectedParking.capacity} Docks
                </div>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleOpenAdd}
                disabled={!selectedParkingId}
                style={{ height: "42px", display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                + Register Cycle
              </button>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Filter and Inventory Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: "220px", maxWidth: "340px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search ID (ABC-001), Model, Colour, Lock..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "0.85rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["all", "Working", "Puncture", "Broken"] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={statusFilter === st ? "btn-primary" : "btn-secondary"}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem" }}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          Loading cycle inventory...
        </div>
      ) : filteredCycles.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
          No cycles matching criteria in this parking lot. Click <strong>+ Register Cycle</strong> to add the first bicycle.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--card-bg-subtle)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Cycle ID</th>
                <th style={{ padding: "0.75rem 1rem" }}>Brand & Model</th>
                <th style={{ padding: "0.75rem 1rem" }}>Colour</th>
                <th style={{ padding: "0.75rem 1rem" }}>Condition</th>
                <th style={{ padding: "0.75rem 1rem" }}>Lock Combo</th>
                <th style={{ padding: "0.75rem 1rem" }}>QR Code URL</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCycles.map((cyc) => (
                <tr key={cyc.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        background: "var(--card-bg-subtle)",
                        border: "1px solid var(--border-color)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.375rem",
                        color: "var(--primary-color)",
                      }}
                    >
                      {cyc.publicCycleId}
                    </span>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {cyc.brand}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {cyc.cycleModel}
                    </div>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "0.25rem",
                        background: "var(--card-bg-subtle)",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.75rem",
                      }}
                    >
                      🎨 {cyc.colour}
                    </span>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontWeight: 600,
                        background:
                          cyc.status === "Working"
                            ? "#f0fdf4"
                            : cyc.status === "Puncture"
                            ? "#fefce8"
                            : "#fef2f2",
                        color:
                          cyc.status === "Working"
                            ? "#15803d"
                            : cyc.status === "Puncture"
                            ? "#854d0e"
                            : "#b91c1c",
                      }}
                    >
                      {cyc.status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "var(--text-main)",
                      }}
                    >
                      🔒 {cyc.lockCode}
                    </span>
                  </td>

                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ...{cyc.qrCode.slice(-8)}
                      </span>
                      <button
                        type="button"
                        className="btn-text"
                        style={{ fontSize: "0.75rem", padding: "0.1rem 0.3rem", color: copiedId === cyc.id ? "#15803d" : "var(--primary-color)" }}
                        onClick={() => handleCopy(cyc.qrUrl, cyc.id)}
                      >
                        {copiedId === cyc.id ? "✓ Copied" : "📋 Copy URL"}
                      </button>
                    </div>
                  </td>

                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                      onClick={() => handleOpenEdit(cyc)}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Cycle Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>🚲 Register Cycle to Parking</h3>
              <button className="btn-text" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {modalError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{modalError}</div>}

            <form onSubmit={handleAddCycle}>
              <div className="form-group">
                <label className="form-label">Public Cycle ID (e.g. ABC-001)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. ABC-001"
                  value={addPublicId}
                  onChange={(e) => setAddPublicId(e.target.value)}
                  style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Company / Brand</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Hero, Firefox"
                    value={addBrand}
                    onChange={(e) => setAddBrand(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Sprint Pro"
                    value={addModel}
                    onChange={(e) => setAddModel(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Frame Colour</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Matte Black"
                    value={addColour}
                    onChange={(e) => setAddColour(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Condition State</label>
                  <select
                    className="form-input"
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as CycleStatus)}
                  >
                    <option value="Working">Working</option>
                    <option value="Puncture">Puncture</option>
                    <option value="Broken">Broken</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Combination Lock Code</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. 4521"
                  value={addLockCode}
                  onChange={(e) => setAddLockCode(e.target.value)}
                  style={{ fontFamily: "monospace", fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">QR Code Token (Compact Base64url)</label>
                  <button
                    type="button"
                    className="btn-text"
                    style={{ fontSize: "0.75rem", padding: 0 }}
                    onClick={() => setAddQrCode(generateToken())}
                  >
                    🎲 Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={addQrCode}
                  onChange={(e) => setAddQrCode(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? "Saving..." : "Register Cycle ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cycle Modal */}
      {editingCycle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.2rem 0" }}>✏️ Edit Cycle {editingCycle.publicCycleId}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {editingCycle.brand} {editingCycle.cycleModel}
                </span>
              </div>
              <button className="btn-text" onClick={() => setEditingCycle(null)}>✕</button>
            </div>

            {modalError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{modalError}</div>}

            <form onSubmit={handleUpdateCycle}>
              <div className="form-group">
                <label className="form-label">Operational Condition</label>
                <select
                  className="form-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as CycleStatus)}
                >
                  <option value="Working">Working</option>
                  <option value="Puncture">Puncture</option>
                  <option value="Broken">Broken</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Combination Lock Code</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editLockCode}
                  onChange={(e) => setEditLockCode(e.target.value)}
                  style={{ fontFamily: "monospace", fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Frame Colour</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editColour}
                  onChange={(e) => setEditColour(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">QR Code Token</label>
                  <button
                    type="button"
                    className="btn-text"
                    style={{ fontSize: "0.75rem", padding: 0 }}
                    onClick={() => setEditQrCode(generateToken())}
                  >
                    🎲 Regenerate Token
                  </button>
                </div>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editQrCode}
                  onChange={(e) => setEditQrCode(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingCycle(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? "Saving..." : "Save Changes ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
