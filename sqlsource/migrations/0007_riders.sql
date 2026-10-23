-- Migration 0007: Rider requests and single-shed parking riders table
-- Enforces single parking shed per rider via UNIQUE(person_id)

CREATE TABLE IF NOT EXISTS rider_requests (
  id TEXT PRIMARY KEY,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  invitation_id TEXT REFERENCES invitations(id) ON DELETE SET NULL,
  previous_parking_id TEXT REFERENCES parkings(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rider_requests_person ON rider_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_rider_requests_parking ON rider_requests(parking_id, status);

CREATE TABLE IF NOT EXISTS parking_riders (
  id TEXT PRIMARY KEY,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  person_id TEXT UNIQUE NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES persons(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parking_riders_person ON parking_riders(person_id);
CREATE INDEX IF NOT EXISTS idx_parking_riders_parking ON parking_riders(parking_id);
