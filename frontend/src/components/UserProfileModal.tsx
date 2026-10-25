import React, { useState } from "react";
import { BycmeClient, Person, Gender } from "../../../generated/shared";

interface UserProfileModalProps {
  apiClient: BycmeClient;
  currentUser: Person;
  token: string;
  onClose: () => void;
  onProfileUpdated: (updated: Person) => void;
}

export function UserProfileModal({
  apiClient,
  currentUser,
  token,
  onClose,
  onProfileUpdated,
}: UserProfileModalProps) {
  const [name, setName] = useState(currentUser.name || "");
  const [dob, setDob] = useState(currentUser.dob || "");
  const [gender, setGender] = useState<Gender | "">(currentUser.gender || "");
  const [mobile, setMobile] = useState(currentUser.mobile || "");
  const [address, setAddress] = useState(currentUser.address || "");
  const [emergencyName, setEmergencyName] = useState(
    currentUser.emergencyContact?.name || ""
  );
  const [emergencyPhone1, setEmergencyPhone1] = useState(
    currentUser.emergencyContact?.phone1 || ""
  );
  const [emergencyPhone2, setEmergencyPhone2] = useState(
    currentUser.emergencyContact?.phone2 || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const emergencyContact =
        emergencyName.trim() || emergencyPhone1.trim() || emergencyPhone2.trim()
          ? {
              name: emergencyName.trim() || undefined,
              phone1: emergencyPhone1.trim() || undefined,
              phone2: emergencyPhone2.trim() || undefined,
            }
          : undefined;

      const updated = await apiClient.updateMyProfile(
        {
          name: name.trim(),
          dob: dob || undefined,
          gender: gender ? (gender as Gender) : undefined,
          mobile: mobile.trim() || undefined,
          address: address.trim() || undefined,
          emergencyContact,
        },
        token
      );
      onProfileUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-main)" }}>👤 My Profile</h3>
          <button className="btn-secondary" style={{ width: "auto", padding: "0.2rem 0.6rem" }} onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div
          style={{
            background: "var(--card-bg-subtle)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            marginBottom: "1.25rem",
            fontSize: "0.85rem",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Email:</span>
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{currentUser.email}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Assigned Hub:</span>
            <span style={{ fontWeight: 600, color: "var(--primary-color)" }}>
              {currentUser.parkingName ? `🚲 ${currentUser.parkingName}` : "Not assigned to any hub"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-muted)" }}>Roles:</span>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {currentUser.roles.map((r) => (
                <span key={r} className={`badge-role badge-${r}`}>
                  {r === "Admin" ? "ClubHero" : r === "Manager" ? "HubHero" : r}
                </span>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
              Display Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Kavita Sharma"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | "")}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
              >
                <option value="">-- Select Gender --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="PreferNotToSay">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
              Mobile Phone
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. +91 98111 22334"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Residential address / flat / tower"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", resize: "vertical" }}
            />
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              paddingTop: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--text-main)" }}>
              🚨 Emergency Contact
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                    Primary Phone
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone1}
                    onChange={(e) => setEmergencyPhone1(e.target.value)}
                    placeholder="e.g. +91 98111 99887"
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                    Secondary Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone2}
                    onChange={(e) => setEmergencyPhone2(e.target.value)}
                    placeholder="e.g. +91 20 2711 0200"
                    style={{ width: "100%", padding: "0.45rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "auto", padding: "0.5rem 1.25rem" }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: "auto", padding: "0.5rem 1.5rem" }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
