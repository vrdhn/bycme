-- Seed 004: Sample Active Managers and Pending Applicant
-- Default password for all seed accounts: Admin@Bycme2026

-- Manager 1: Anita Desai -> Gate 1 Residential Stand (Pune - Greenwood Heights)
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

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-001', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-001', 'prk-gw-gate1', 'mgr-001', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 2: Vikram Joshi -> Clubhouse Stand (Pune - Greenwood Heights)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-002',
  'vikram@bycme.in',
  'Vikram Joshi',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-002', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-002', 'prk-gw-clubhouse', 'mgr-002', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 3: Suresh Reddy -> East Gate Stand (Bengaluru - Palm Meadows Enclave)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-003',
  'suresh@bycme.in',
  'Suresh Reddy',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-003', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-003', 'prk-palm-east', 'mgr-003', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 4: Priya Nair -> Sports Arena Stand (Bengaluru - Palm Meadows Enclave)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-004',
  'priya@bycme.in',
  'Priya Nair',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-004', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-004', 'prk-palm-sports', 'mgr-004', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 5: Rahul Verma -> Podium Level Stand (Hyderabad - My Home Bhooja)
INSERT INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-005',
  'rahul@bycme.in',
  'Rahul Verma',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-005', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-005', 'prk-bhooja-podium', 'mgr-005', 'admin-001')
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
