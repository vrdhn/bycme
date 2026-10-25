/**
 * Backend environment and core domain types.
 */

export interface Env {
  DB: D1Database;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  createdAt: string;
}

export interface PersonRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

export interface RoleRow {
  person_id: string;
  role: string;
}
