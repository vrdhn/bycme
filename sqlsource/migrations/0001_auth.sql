-- Authentication and user identity schema

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS person_roles (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Rider')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(person_id, role)
);

CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
CREATE INDEX IF NOT EXISTS idx_person_roles_person_id ON person_roles(person_id);
