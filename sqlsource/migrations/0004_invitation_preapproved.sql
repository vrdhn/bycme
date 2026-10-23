-- Add is_preapproved flag to invitations table

ALTER TABLE invitations ADD COLUMN is_preapproved INTEGER NOT NULL DEFAULT 0;
