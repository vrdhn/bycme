-- Bycme redesigned schema with buildings, parkings, persons, roles, invitations, cycles, and rides

CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  building_type TEXT NOT NULL CHECK (building_type IN ('Private', 'Public')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parkings (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES buildings(id)
);

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS person_roles (
  person_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Rider')),
  PRIMARY KEY (person_id, role),
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parking_managers (
  parking_id TEXT NOT NULL,
  manager_id TEXT NOT NULL,
  PRIMARY KEY (parking_id, manager_id),
  FOREIGN KEY (parking_id) REFERENCES parkings(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parking_memberships (
  id TEXT PRIMARY KEY,
  parking_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disapproved')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parking_id) REFERENCES parkings(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  parking_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parking_id) REFERENCES parkings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES persons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  public_cycle_id TEXT NOT NULL UNIQUE,
  parking_id TEXT NOT NULL,
  make_model TEXT NOT NULL,
  qr_code TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Working' CHECK (condition IN ('Working', 'Broken', 'Puncture')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parking_id) REFERENCES parkings(id)
);

CREATE TABLE IF NOT EXISTS cycle_condition_trails (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  from_condition TEXT NOT NULL,
  to_condition TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES persons(id)
);

CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  rider_id TEXT NOT NULL,
  parking_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  checkout_notes TEXT NOT NULL DEFAULT '',
  checkin_notes TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES cycles(id),
  FOREIGN KEY (rider_id) REFERENCES persons(id),
  FOREIGN KEY (parking_id) REFERENCES parkings(id)
);

-- Seed baseline entities
INSERT OR IGNORE INTO buildings (id, name, building_type)
VALUES
  ('bld-tech-park', 'Silicon Tech Park', 'Private'),
  ('bld-civic-center', 'Downtown Civic Plaza', 'Public');

INSERT OR IGNORE INTO parkings (id, building_id, name, capacity)
VALUES
  ('prk-tech-north', 'bld-tech-park', 'North Gate Hub', 25),
  ('prk-plaza-main', 'bld-civic-center', 'Central Plaza Stand', 15);

INSERT OR IGNORE INTO persons (id, name, email, password_hash)
VALUES
  ('usr-admin', 'System Admin', 'admin@bycme.local', 'admin123'),
  ('usr-manager-alice', 'Alice Manager', 'alice@bycme.local', 'alice123'),
  ('usr-rider-bob', 'Bob Rider', 'bob@bycme.local', 'bob123');

INSERT OR IGNORE INTO person_roles (person_id, role)
VALUES
  ('usr-admin', 'Admin'),
  ('usr-manager-alice', 'Manager'),
  ('usr-rider-bob', 'Rider');

INSERT OR IGNORE INTO parking_managers (parking_id, manager_id)
VALUES
  ('prk-tech-north', 'usr-manager-alice');

INSERT OR IGNORE INTO parking_memberships (id, parking_id, person_id, status)
VALUES
  ('pm-bob', 'prk-tech-north', 'usr-rider-bob', 'approved');

INSERT OR IGNORE INTO cycles (id, public_cycle_id, parking_id, make_model, qr_code, condition)
VALUES
  ('cyc-1', 'CYC-101', 'prk-tech-north', 'Trek FX 2 / Black', 'BYCME:CYC-101', 'Working'),
  ('cyc-2', 'CYC-102', 'prk-tech-north', 'Giant Escape / Blue', 'BYCME:CYC-102', 'Working'),
  ('cyc-3', 'CYC-201', 'prk-plaza-main', 'Specialized Sirrus / Red', 'BYCME:CYC-201', 'Working');

INSERT OR IGNORE INTO invitations (id, code, parking_id, created_by, status)
VALUES
  ('inv-sample', 'JOIN-NORTH-2026', 'prk-tech-north', 'usr-manager-alice', 'active');
