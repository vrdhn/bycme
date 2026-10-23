-- Migration 0008: Cycle checkouts table
-- Enforces at most 1 active checkout per cycle and at most 1 active checkout per rider

CREATE TABLE IF NOT EXISTS cycle_checkouts (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES cycles(id) ON DELETE RESTRICT,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE RESTRICT,
  checked_out_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  returned_at DATETIME,
  status TEXT NOT NULL CHECK (status IN ('active', 'returned')) DEFAULT 'active'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_checkouts_active_cycle 
  ON cycle_checkouts(cycle_id) WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycle_checkouts_active_person 
  ON cycle_checkouts(person_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_cycle_checkouts_parking 
  ON cycle_checkouts(parking_id, status);

CREATE INDEX IF NOT EXISTS idx_cycle_checkouts_person 
  ON cycle_checkouts(person_id, status);
