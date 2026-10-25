/**
 * Backend environment and core domain types.
 */

export interface Env {
  DB: D1Database;
}

export type Gender = "Male" | "Female" | "Other" | "PreferNotToSay";

export interface EmergencyContact {
  name?: string;
  phone1?: string;
  phone2?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  parkingId?: string;
  parkingName?: string;
  dob?: string;
  gender?: Gender;
  mobile?: string;
  comments?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  roles: string[];
  createdAt: string;
}

export interface PersonRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  password_salt: string;
  dob?: string | null;
  gender?: string | null;
  mobile?: string | null;
  comments?: string | null;
  address?: string | null;
  emergency_name?: string | null;
  emergency_phone1?: string | null;
  emergency_phone2?: string | null;
  created_at: string;
}

export interface RoleRow {
  person_id: string;
  role: string;
}
