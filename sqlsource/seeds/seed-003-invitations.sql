-- Seed 003: Initial sample manager invitation

INSERT OR REPLACE INTO invitations (id, token, parking_id, role, created_by, status, is_preapproved, expires_at)
VALUES (
  'inv-mgr-sample-001',
  'v7K9Lm3XqP1oZ8wA2bC4dE',
  'prk-tm-tower-a',
  'Manager',
  'admin-001',
  'active',
  1,
  datetime('now', '+24 hours')
);
