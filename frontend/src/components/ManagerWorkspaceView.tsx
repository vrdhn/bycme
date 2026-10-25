import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BycmeClient,
  Parking,
  Cycle,
  CycleStatus,
  ParkingRider,
  RiderRequest,
  ManagerInvitation,
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

  // Manager Workspace Subtabs
  const [managerTab, setManagerTab] = useState<"cycles" | "riders">("cycles");

  // Riders state
  const [riders, setRiders] = useState<ParkingRider[]>([]);
  const [riderRequests, setRiderRequests] = useState<RiderRequest[]>([]);
  const [riderInvites, setRiderInvites] = useState<ManagerInvitation[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Rider Invite Modal state
  const [showRiderInviteModal, setShowRiderInviteModal] = useState(false);
  const [riderInviteDuration, setRiderInviteDuration] = useState<number>(24);
  const [riderInvitePreapproved, setRiderInvitePreapproved] = useState<boolean>(false);
  const [createdRiderInvite, setCreatedRiderInvite] = useState<ManagerInvitation | null>(null);
  const [riderInviteLoading, setRiderInviteLoading] = useState(false);
  const [riderInviteError, setRiderInviteError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : "Failed to load managed hubs");
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

  // Load riders data for selected parking
  const loadRidersData = useCallback(async () => {
    if (!selectedParkingId) return;
    setRidersLoading(true);
    try {
      const [rList, reqList, invList] = await Promise.all([
        apiClient.listParkingRiders(selectedParkingId, token),
        apiClient.listParkingRiderRequests(selectedParkingId, token),
        apiClient.listRiderInvitations(selectedParkingId, token),
      ]);
      setRiders(rList);
      setRiderRequests(reqList);
      setRiderInvites(invList);
    } catch {
      // ignore
    } finally {
      setRidersLoading(false);
    }
  }, [apiClient, selectedParkingId, token]);

  useEffect(() => {
    loadRidersData();
  }, [loadRidersData]);

  const handleApproveRider = async (reqId: string) => {
    setActionInProgress(reqId);
    setError(null);
    try {
      await apiClient.approveParkingRiderRequest(selectedParkingId, reqId, token);
      setSuccessMsg("Approved rider request successfully");
      setTimeout(() => setSuccessMsg(null), 3500);
      loadRidersData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve rider request");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectRider = async (reqId: string) => {
    setActionInProgress(reqId);
    setError(null);
    try {
      await apiClient.rejectParkingRiderRequest(selectedParkingId, reqId, token);
      setSuccessMsg("Rejected rider request");
      setTimeout(() => setSuccessMsg(null), 3500);
      loadRidersData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject rider request");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateRiderInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setRiderInviteLoading(true);
    setRiderInviteError(null);
    try {
      const inv = await apiClient.createRiderInvitation(
        selectedParkingId,
        {
          durationHours: riderInviteDuration,
          isPreapproved: riderInvitePreapproved,
        },
        token
      );
      setCreatedRiderInvite(inv);
      loadRidersData();
    } catch (err) {
      setRiderInviteError(err instanceof Error ? err.message : "Failed to create rider invitation");
    } finally {
      setRiderInviteLoading(false);
    }
  };

  const handleRevokeRiderInvite = async (invId: string) => {
    setError(null);
    try {
      await apiClient.revokeRiderInvitation(selectedParkingId, invId, token);
      setSuccessMsg("Rider invitation revoked");
      setTimeout(() => setSuccessMsg(null), 3000);
      loadRidersData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  };

  const selectedParking = parkings.find((p) => p.id === selectedParkingId);

  const existingBrands = useMemo(() => {
    return Array.from(new Set(cycles.map((c) => c.brand).filter(Boolean))).sort();
  }, [cycles]);

  const existingModels = useMemo(() => {
    return Array.from(new Set(cycles.map((c) => c.cycleModel).filter(Boolean))).sort();
  }, [cycles]);

  const existingColours = useMemo(() => {
    return Array.from(new Set(cycles.map((c) => c.colour).filter(Boolean))).sort();
  }, [cycles]);

  const computeNextCycleId = useCallback(() => {
    const cityName = selectedParking?.cityName;
    const prefix = cityName ? cityName.slice(0, 3).toUpperCase() : "CYC";
    let maxNum = 0;
    for (const c of cycles) {
      if (c.publicCycleId.startsWith(`${prefix}-`)) {
        const parts = c.publicCycleId.split("-");
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    return `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
  }, [selectedParking, cycles]);

  const handleOpenAdd = () => {
    setAddPublicId(computeNextCycleId());
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
    setEditLockCode(cycle.lockCode || "");
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

  const filteredCycles = cycles.filter((c) => {
    const matchesSearch =
      c.publicCycleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cycleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.colour.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lockCode || "").includes(searchQuery);

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Station Selector & Utilization Card */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <label className="form-label">Active Hub</label>
            <select
              className="form-input"
              value={selectedParkingId}
              onChange={(e) => setSelectedParkingId(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {parkings.length === 0 ? (
                <option value="">No managed hubs assigned</option>
              ) : (
                parkings.map((p) => (
                  <option key={p.id} value={p.id}>
                    📍 {p.name} ({p.buildingName || "Club"}, {p.cityName || "City"})
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

      {/* Manager Workspace Subtabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={managerTab === "cycles" ? "btn-primary" : "btn-secondary"}
          style={{ width: "auto", padding: "0.45rem 1.25rem" }}
          onClick={() => setManagerTab("cycles")}
        >
          🚲 Cycles Fleet ({cycles.length})
        </button>
        <button
          type="button"
          className={managerTab === "riders" ? "btn-primary" : "btn-secondary"}
          style={{ width: "auto", padding: "0.45rem 1.25rem" }}
          onClick={() => setManagerTab("riders")}
        >
          👥 Riders & Access ({riders.length})
        </button>
      </div>

      {successMsg && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {successMsg}
        </div>
      )}

      {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Cycles Fleet Tab */}
      {managerTab === "cycles" && (
        <>
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
          No cycles matching criteria in this hub. Click <strong>+ Register Cycle</strong> to add the first bicycle.
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
                      🔒 {cyc.lockCode || "----"}
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
      </>
      )}

      {/* Riders Tab View */}
      {managerTab === "riders" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--text-main)" }}>👥 Riders & Hub Access</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Manage rider access, generate invitations, and review transfer requests for {selectedParking?.name}.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setCreatedRiderInvite(null);
                setRiderInviteError(null);
                setShowRiderInviteModal(true);
              }}
              disabled={!selectedParkingId}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              🔑 + Invite Rider
            </button>
          </div>

          {/* Section 1: Pending Access & Transfer Requests */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>📬 Pending Requests</span>
              {riderRequests.filter((r) => r.status === "pending").length > 0 && (
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "1rem",
                  }}
                >
                  {riderRequests.filter((r) => r.status === "pending").length}
                </span>
              )}
            </h4>

            {ridersLoading ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading requests...</p>
            ) : riderRequests.filter((r) => r.status === "pending").length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                No pending rider requests for this hub.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {riderRequests
                  .filter((r) => r.status === "pending")
                  .map((req) => (
                    <div
                      key={req.id}
                      style={{
                        padding: "0.85rem 1rem",
                        background: "var(--card-bg-subtle)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                          {req.personName || "Unknown Applicant"}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{req.personEmail}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          Submitted: {new Date(req.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                        {req.isSwitch && (
                          <div style={{ marginTop: "0.4rem" }}>
                            <span
                              style={{
                                background: "#fff7ed",
                                color: "#c2410c",
                                border: "1px solid #fed7aa",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "0.25rem",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              🔄 Hub Transfer from {req.previousParkingName || "Previous Hub"}
                              {req.previousCityName ? ` (${req.previousCityName})` : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}
                          disabled={actionInProgress === req.id}
                          onClick={() => handleApproveRider(req.id)}
                        >
                          {actionInProgress === req.id ? "Processing..." : "✓ Approve"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", color: "#dc2626" }}
                          disabled={actionInProgress === req.id}
                          onClick={() => handleRejectRider(req.id)}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Riders Directory */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🚴 Active Riders Directory</span>
              <span
                style={{
                  background: "var(--card-bg-subtle)",
                  color: "var(--primary-color)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "1rem",
                }}
              >
                {riders.length} active
              </span>
            </h4>

            {ridersLoading ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading active riders...</p>
            ) : riders.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                No active riders registered for this hub. Click <strong>+ Invite Rider</strong> to onboard users.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--card-bg-subtle)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Rider Name</th>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Email Address</th>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Enrolled Date</th>
                      <th style={{ padding: "0.6rem 0.75rem" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riders.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{r.personName}</td>
                        <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>{r.personEmail}</td>
                        <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "0.6rem 0.75rem" }}>
                          <span
                            style={{
                              background: "#f0fdf4",
                              color: "#15803d",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "0.25rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Active Rider Invitations */}
          <div className="card">
            <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)" }}>
              🎟️ Active Rider Invitations ({riderInvites.filter((i) => i.status === "active").length})
            </h4>

            {riderInvites.filter((i) => i.status === "active").length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                No active invitations. Click <strong>+ Invite Rider</strong> to generate a link.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {riderInvites
                  .filter((i) => i.status === "active")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        padding: "0.75rem 1rem",
                        background: "var(--card-bg-subtle)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "0.25rem",
                              background: inv.isPreapproved ? "#fef3c7" : "#e0f2fe",
                              color: inv.isPreapproved ? "#92400e" : "#0369a1",
                              fontWeight: 700,
                            }}
                          >
                            {inv.isPreapproved ? "⚡ PRE-APPROVED" : "📋 STANDARD"}
                          </span>
                          <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            Token: {inv.token.slice(0, 10)}...
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Expires: {new Date(inv.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                          onClick={() => handleCopy(inv.inviteUrl, inv.id)}
                        >
                          {copiedId === inv.id ? "✓ Copied" : "📋 Copy Link"}
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(inv.whatsappMessage)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", textDecoration: "none" }}
                        >
                          💬 WhatsApp
                        </a>
                        <button
                          type="button"
                          className="btn-text"
                          style={{ fontSize: "0.75rem", color: "#dc2626", padding: "0.25rem 0.5rem" }}
                          onClick={() => handleRevokeRiderInvite(inv.id)}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
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
              <h3 style={{ margin: 0 }}>🚲 Register Cycle to Hub</h3>
              <button className="btn-text" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {modalError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{modalError}</div>}

            <form onSubmit={handleAddCycle}>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">Public Cycle ID (Auto-generated)</label>
                  <span style={{ fontSize: "0.75rem", color: "var(--primary-color)", fontWeight: 600 }}>
                    🔒 Auto-assigned
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={addPublicId}
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: "var(--bg-muted, #f1f5f9)",
                    cursor: "not-allowed",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Company / Brand</label>
                  <input
                    type="text"
                    required
                    list="brand-options-list"
                    className="form-input"
                    placeholder="Select or enter brand"
                    value={addBrand}
                    onChange={(e) => setAddBrand(e.target.value)}
                  />
                  <datalist id="brand-options-list">
                    {existingBrands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input
                    type="text"
                    required
                    list="model-options-list"
                    className="form-input"
                    placeholder="Select or enter model"
                    value={addModel}
                    onChange={(e) => setAddModel(e.target.value)}
                  />
                  <datalist id="model-options-list">
                    {existingModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label className="form-label">Frame Colour</label>
                  <input
                    type="text"
                    required
                    list="colour-options-list"
                    className="form-input"
                    placeholder="Select or enter colour"
                    value={addColour}
                    onChange={(e) => setAddColour(e.target.value)}
                  />
                  <datalist id="colour-options-list">
                    {existingColours.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
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
                <label className="form-label">Combination Lock Code (Numbers only)</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  placeholder="e.g. 4521"
                  value={addLockCode}
                  onChange={(e) => setAddLockCode(e.target.value.replace(/\D/g, ""))}
                  style={{ fontFamily: "monospace", fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">QR Code Token (Auto-generated)</label>
                  <button
                    type="button"
                    className="btn-text"
                    style={{ fontSize: "0.75rem", padding: 0 }}
                    onClick={() => setAddQrCode(generateToken())}
                    title="Generate a fresh token"
                  >
                    🎲 Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={addQrCode}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    background: "var(--bg-muted, #f1f5f9)",
                    cursor: "not-allowed",
                  }}
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
                <label className="form-label">Combination Lock Code (Numbers only)</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-input"
                  value={editLockCode}
                  onChange={(e) => setEditLockCode(e.target.value.replace(/\D/g, ""))}
                  style={{ fontFamily: "monospace", fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Frame Colour</label>
                <input
                  type="text"
                  required
                  list="colour-options-list"
                  className="form-input"
                  value={editColour}
                  onChange={(e) => setEditColour(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">QR Code Token (Non-editable)</label>
                  <button
                    type="button"
                    className="btn-text"
                    style={{ fontSize: "0.75rem", padding: 0 }}
                    onClick={() => setEditQrCode(generateToken())}
                    title="Generate a fresh token"
                  >
                    🎲 Regenerate Token
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={editQrCode}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    background: "var(--bg-muted, #f1f5f9)",
                    cursor: "not-allowed",
                  }}
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

      {/* Rider Invite Modal */}
      {showRiderInviteModal && (
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
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: "520px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "var(--text-main)" }}>
                🔑 Invite Rider
              </h3>
              <button
                type="button"
                className="btn-text"
                style={{ fontSize: "1.2rem", padding: "0.2rem" }}
                onClick={() => setShowRiderInviteModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Target Hub: <strong>{selectedParking?.name}</strong>
              {selectedParking?.cityName ? ` (${selectedParking.cityName})` : ""}
            </div>

            {riderInviteError && <div className="alert-error" style={{ marginBottom: "1rem" }}>{riderInviteError}</div>}

            {createdRiderInvite ? (
              <div>
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#15803d",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                    ✓ Rider Invitation Link Generated!
                  </div>
                  <div>
                    This invitation is valid for {riderInviteDuration} hours.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Invitation Link (Route: /#/join/rider/...)</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      value={createdRiderInvite.inviteUrl}
                      style={{ fontSize: "0.8rem", fontFamily: "monospace" }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleCopy(createdRiderInvite.inviteUrl, "created-invite")}
                      style={{ minWidth: "90px" }}
                    >
                      {copiedId === "created-invite" ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Share Message</label>
                  <textarea
                    readOnly
                    className="form-input"
                    rows={4}
                    value={createdRiderInvite.whatsappMessage}
                    style={{ fontSize: "0.8rem", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(createdRiderInvite.whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "inline-block" }}
                  >
                    💬 Share on WhatsApp
                  </a>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setCreatedRiderInvite(null);
                      setShowRiderInviteModal(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateRiderInvite}>
                <div className="form-group">
                  <label className="form-label">Link Validity Duration</label>
                  <select
                    className="form-input"
                    value={riderInviteDuration}
                    onChange={(e) => setRiderInviteDuration(Number(e.target.value))}
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours (1 day default)</option>
                    <option value={48}>48 hours (2 days)</option>
                    <option value={168}>7 days (1 week)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={riderInvitePreapproved}
                      onChange={(e) => setRiderInvitePreapproved(e.target.checked)}
                      style={{ marginTop: "0.2rem" }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)" }}>
                        ⚡ Pre-approved (Single-use direct activation)
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        The recipient directly joins this hub without requiring further HubHero approval.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowRiderInviteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={riderInviteLoading}
                  >
                    {riderInviteLoading ? "Generating..." : "Generate Invitation ➔"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
