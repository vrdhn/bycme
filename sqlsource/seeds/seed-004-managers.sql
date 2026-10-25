-- Seed 004: Sample Active Managers and Pending Applicant
-- Default password for all seed accounts: Admin@Bycme2026

-- Manager 1: Anita Desai -> Gate 1 Residential Stand (Pune - Greenwood Heights)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'mgr-001',
  'anita@bycme.in',
  'Anita Desai',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1988-06-14',
  'Female',
  '+91 98220 54321',
  'Gate 1 Hub Manager',
  'Flat 101, Tower C, Greenwood Heights, Pune',
  'Siddharth Desai',
  '+91 98220 87654',
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

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-001', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-001', 'prk-gw-gate1', 'mgr-001', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 2: Vikram Joshi -> Clubhouse Stand (Pune - Greenwood Heights)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'mgr-002',
  'vikram@bycme.in',
  'Vikram Joshi',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1984-12-05',
  'Male',
  '+91 98220 65432',
  'Clubhouse stand manager and sports coordinator',
  'Villa 8, Greenwood Heights, Pune',
  'Meera Joshi',
  '+91 98220 98765',
  '+91 20 2744 1122'
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

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-002', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-002', 'prk-gw-clubhouse', 'mgr-002', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 3: Suresh Reddy -> East Gate Stand (Bengaluru - Palm Meadows Enclave)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'mgr-003',
  'suresh@bycme.in',
  'Suresh Reddy',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1986-09-18',
  'Male',
  '+91 98450 12345',
  'Palm Meadows East Gate manager',
  'Block 2, Palm Meadows, Whitefield, Bengaluru',
  'Lakshmi Reddy',
  '+91 98450 54321',
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

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-003', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-003', 'prk-palm-east', 'mgr-003', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 4: Priya Nair -> Sports Arena Stand (Bengaluru - Palm Meadows Enclave)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'mgr-004',
  'priya@bycme.in',
  'Priya Nair',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1991-01-22',
  'Female',
  '+91 98450 67890',
  'Sports Arena manager',
  'Block 5, Palm Meadows, Whitefield, Bengaluru',
  'Gopal Nair',
  '+91 98450 09876',
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

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-004', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-004', 'prk-palm-sports', 'mgr-004', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Manager 5: Rahul Verma -> Podium Level Stand (Hyderabad - My Home Bhooja)
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'mgr-005',
  'rahul@bycme.in',
  'Rahul Verma',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1987-07-10',
  'Male',
  '+91 99880 11223',
  'Podium Level hub manager',
  'Tower 4, My Home Bhooja, HITEC City, Hyderabad',
  'Anjali Verma',
  '+91 99880 33221',
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

INSERT OR IGNORE INTO person_roles (person_id, role) VALUES ('mgr-005', 'Manager');

INSERT INTO parking_managers (id, parking_id, person_id, assigned_by)
VALUES ('pm-sample-005', 'prk-bhooja-podium', 'mgr-005', 'admin-001')
ON CONFLICT(id) DO UPDATE SET
  parking_id = excluded.parking_id,
  person_id = excluded.person_id,
  assigned_by = excluded.assigned_by;

-- Pending Applicant: Rajesh Kumar requesting prk-palm-east
INSERT INTO persons (
  id, email, name, password_hash, password_salt,
  dob, gender, mobile, comments, address, emergency_name, emergency_phone1, emergency_phone2
)
VALUES (
  'mgr-app-001',
  'rajesh@bycme.in',
  'Rajesh Kumar',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131',
  '1993-04-19',
  'Male',
  '+91 97400 55667',
  'Applicant for Palm Meadows East Gate',
  'Block 1, Palm Meadows, Whitefield, Bengaluru',
  'Neeta Kumar',
  '+91 97400 77665',
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

-- Manager request from Rajesh Kumar for prk-palm-east
INSERT INTO manager_requests (id, parking_id, person_id, invitation_id, status)
VALUES ('req-sample-001', 'prk-palm-east', 'mgr-app-001', NULL, 'pending')
ON CONFLICT(parking_id, person_id, status) DO NOTHING;
