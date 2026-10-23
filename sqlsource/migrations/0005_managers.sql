-- Migration 0005: Manager Requests and Parking Managers tables

CREATE TABLE IF NOT EXISTS manager_requests (
  id TEXT PRIMARY KEY,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  invitation_id TEXT REFERENCES invitations(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parking_id, person_id, status)
);

CREATE INDEX IF NOT EXISTS idx_manager_requests_person ON manager_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_manager_requests_parking ON manager_requests(parking_id, status);

CREATE TABLE IF NOT EXISTS parking_managers (
  id TEXT PRIMARY KEY,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES persons(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parking_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_parking_managers_person ON parking_managers(person_id);
CREATE INDEX IF NOT EXISTS idx_parking_managers_parking ON parking_managers(parking_id);
