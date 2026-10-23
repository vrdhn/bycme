-- Seed 001: Initial System Administrator
-- Default credentials: admin@bycme.in / Admin@Bycme2026

INSERT OR REPLACE INTO persons (id, email, name, password_hash, password_salt)
VALUES (
  'admin-001',
  'admin@bycme.in',
  'System Administrator',
  '49f7d72a8ed0185631083f45fe922577aa599a687f11197c8458b872d672dc9b',
  '60fadeca6a9cef026e01d4276b322153734206d178bc105acbdf85d7d5d84131'
);

INSERT OR REPLACE INTO person_roles (id, person_id, role)
VALUES (
  'role-admin-001',
  'admin-001',
  'Admin'
);
