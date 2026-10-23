-- Seed 004: Sample Active Manager and Pending Applicant
-- Passwords for both: Admin@Bycme2026

-- Active Manager: Anita Desai for Gate 1 Residential Stand (prk-gw-gate1)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-001',
  'anita@bycme.in',
  'Anita Desai',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role)
VALUES ('mgr-001', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-001', 'prk-gw-gate1', 'mgr-001', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Pending Applicant: Rajesh Kumar requesting prk-palm-east
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-app-001',
  'rajesh@bycme.in',
  'Rajesh Kumar',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT INTO manager_requests (id, parking_id, person_id, invitation_id, status)
VALUES (
  'req-sample-001',
  'prk-palm-east',
  'mgr-app-001',
  'inv-mgr-sample-002',
  'pending'
)
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  invitation_id = excluded.invitation_id,
  status = excluded.status;
