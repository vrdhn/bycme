-- Migration 0009: Cycle checkout damage and condition reporting on return
-- Allows rider to specify cycle condition ('Working', 'Puncture', 'Broken') and optional notes

ALTER TABLE cycle_checkouts ADD COLUMN return_condition TEXT CHECK (return_condition IN ('Working', 'Puncture', 'Broken')) DEFAULT 'Working';
ALTER TABLE cycle_checkouts ADD COLUMN return_notes TEXT;
