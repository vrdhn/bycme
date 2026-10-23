-- Migration 0006: Cycles table for bicycle inventory management

CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  public_cycle_id TEXT UNIQUE NOT NULL COLLATE NOCASE,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE RESTRICT,
  company TEXT NOT NULL,
  model TEXT NOT NULL,
  colour TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Working', 'Puncture', 'Broken')) DEFAULT 'Working',
  lock_code TEXT NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cycles_public_id ON cycles(public_cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycles_parking_id ON cycles(parking_id);
CREATE INDEX IF NOT EXISTS idx_cycles_qr_code ON cycles(qr_code);
