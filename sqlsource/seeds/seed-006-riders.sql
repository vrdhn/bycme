-- Seed 006: Sample Riders, Active Stand Assignments, and Transfer Requests
-- Password for all seed accounts: Admin@Bycme2026

-- Rider 1: Kavita Sharma -> Assigned to Gate 1 Stand (prk-gw-gate1)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'rdr-001',
  'kavita@bycme.in',
  'Kavita Sharma',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1995-08-20',
  'Female',
  '+91 98111 22334',
  'Regular commuter',
  'Flat 302, Tower B, Greenwood Heights, Pune',
  'Ramesh Sharma',
  '+91 98111 99887',
  NULL
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  dob = excluded.dob,
  gender = excluded.gender,
  mobile = excluded.mobile,
  comments = excluded.comments,
  address = excluded.address,
  emergency_name = excluded.emergency_name,
  emergency_phone1 = excluded.emergency_phone1,
  emergency_phone2 = excluded.emergency_phone2;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('rdr-001', 'Rider');

INSERT INTO parking_riders (id, parking_id, person_id, assigned_by)
VALUES ('pr-sample-001', 'prk-gw-gate1', 'rdr-001', 'mgr-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Rider 2: Rahim Khan -> Assigned to Clubhouse Stand (prk-gw-clubhouse)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'rdr-002',
  'rahim@bycme.in',
  'Rahim Khan',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1992-03-15',
  'Male',
  '+91 97222 33445',
  'Clubhouse fitness enthusiast',
  'Villa 12, Greenwood Heights, Pune',
  'Amina Khan',
  '+91 97222 88776',
  '+91 20 2711 0200'
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  dob = excluded.dob,
  gender = excluded.gender,
  mobile = excluded.mobile,
  comments = excluded.comments,
  address = excluded.address,
  emergency_name = excluded.emergency_name,
  emergency_phone1 = excluded.emergency_phone1,
  emergency_phone2 = excluded.emergency_phone2;

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('rdr-002', 'Rider');

INSERT INTO parking_riders (id, parking_id, person_id, assigned_by)
VALUES ('pr-sample-002', 'prk-gw-clubhouse', 'rdr-002', 'mgr-002')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Rider 3: Deepak Patel -> Currently at Clubhouse Stand (prk-gw-clubhouse) with pending transfer to Gate 1 (prk-gw-gate1)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'rdr-003',
  'deepak@bycme.in',
  'Deepak Patel',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1989-11-28',
  'Male',
  '+91 96333 44556',
  'Requested transfer to Gate 1',
  'Flat 504, Tower A, Greenwood Heights, Pune',
  'Sunita Patel',
  '+91 96333 77665',
  NULL
)
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  dob = excluded.dob,
  gender = excluded.gender,
  mobile = excluded.mobile,
  comments = excluded.comments,
  address = excluded.address,
  emergency_name = excluded.emergency_name,
  emergency_phone1 = excluded.emergency_phone1,
  emergency_phone2 = excluded.emergency_phone2;

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
