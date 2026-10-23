-- Invitations table for parking managers and riders

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  parking_id TEXT NOT NULL REFERENCES parkings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Manager', 'Rider')),
  created_by TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked')),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_parking_id ON invitations(parking_id);
CREATE INDEX IF NOT EXISTS idx_invitations_parking_role_status ON invitations(parking_id, role, status, expires_at);
