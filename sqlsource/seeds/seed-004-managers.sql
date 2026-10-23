-- Seed 004: Sample Manager Applicant and Initial Request
-- Sample applicant credentials: rajesh@bycme.in / Admin@Bycme2026

INSERT OR REPLACE INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'mgr-app-001',
  'rajesh@bycme.in',
  'Rajesh Kumar',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
);

INSERT OR REPLACE INTO manager_requests (id, parking_id, person_id, invitation_id, status)
VALUES (
  'req-sample-001',
  'prk-tm-tower-a',
  'mgr-app-001',
  'inv-mgr-sample-001',
  'pending'
);
