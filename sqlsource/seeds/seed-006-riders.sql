-- Seed 006: Sample Riders, Active Stand Assignments, and Transfer Requests
-- Password for all seed accounts: Admin@Bycme2026

-- Rider 1: Kavita Sharma -> Assigned to Gate 1 Stand (prk-gw-gate1)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'rdr-001',
  'kavita@bycme.in',
  'Kavita Sharma',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('rdr-001', 'Rider');

INSERT INTO parking_riders (id, parking_id, person_id, assigned_by)
VALUES ('pr-sample-001', 'prk-gw-gate1', 'rdr-001', 'mgr-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Rider 2: Rahim Khan -> Assigned to Clubhouse Stand (prk-gw-clubhouse)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'rdr-002',
  'rahim@bycme.in',
  'Rahim Khan',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('rdr-002', 'Rider');

INSERT INTO parking_riders (id, parking_id, person_id, assigned_by)
VALUES ('pr-sample-002', 'prk-gw-clubhouse', 'rdr-002', 'mgr-002')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Rider 3: Deepak Patel -> Currently at Clubhouse Stand (prk-gw-clubhouse) with pending transfer to Gate 1 (prk-gw-gate1)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'rdr-003',
  'deepak@bycme.in',
  'Deepak Patel',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('rdr-003', 'Rider');

INSERT INTO parking_riders (id, parking_id, person_id, assigned_by)
VALUES ('pr-sample-003', 'prk-gw-clubhouse', 'rdr-003', 'mgr-002')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Pending Transfer Request from Deepak Patel to Gate 1 Stand
INSERT INTO rider_requests (id, parking_id, person_id, invitation_id, previous_parking_id, status)
VALUES ('req-rdr-sample-001', 'prk-gw-gate1', 'rdr-003', NULL, 'prk-gw-clubhouse', 'pending')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  previous_parking_id = excluded.previous_parking_id,
  status = excluded.status;

-- Sample Active Rider Invitation for Gate 1 Stand
INSERT INTO invitations (id, token, parking_id, role, created_by, status, is_preapproved, expires_at)
VALUES (
  'inv-rdr-seed-001',
  'rdr_gate1_seed_token',
  'prk-gw-gate1',
  'Rider',
  'mgr-001',
  'active',
  1,
  '2027-01-01T00:00:00Z'
)
ON CONFLICT(id) DO UPDATE SET
  token = excluded.token,
  parking_id = excluded.parking_id,
  role = excluded.role,
  created_by = excluded.created_by,
  status = excluded.status,
  is_preapproved = excluded.is_preapproved,
  expires_at = excluded.expires_at;
