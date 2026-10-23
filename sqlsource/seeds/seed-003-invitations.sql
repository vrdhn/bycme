-- Seed 003: Initial sample manager invitations for private residential parkings

INSERT INTO invitations (id, token, parking_id, role, created_by, status, is_preapproved, expires_at)
VALUES
(
  'inv-mgr-sample-001',
  'v7K9Lm3XqP1oZ8wA2bC4dE',
  'prk-gw-gate1',
  'Manager',
  'admin-001',
  'active',
  1,
  datetime('now', '+24 hours')
),
(
  'inv-mgr-sample-002',
  'n3M5q8P2rT4vW6xY8zB1cD',
  'prk-palm-east',
  'Manager',
  'admin-001',
  'active',
  0,
  datetime('now', '+48 hours')
)
ON CONFLICT(id) DO UPDATE SET
  token = excluded.token,
  parking_id = excluded.parking_id,
  role = excluded.role,
  created_by = excluded.created_by,
  status = excluded.status,
  is_preapproved = excluded.is_preapproved,
  expires_at = excluded.expires_at;
