-- Migration 0010: Add personal details and emergency contact fields to persons

ALTER TABLE persons ADD COLUMN dob TEXT;
ALTER TABLE persons ADD COLUMN gender TEXT;
ALTER TABLE persons ADD COLUMN mobile TEXT;
ALTER TABLE persons ADD COLUMN comments TEXT;
ALTER TABLE persons ADD COLUMN address TEXT;
ALTER TABLE persons ADD COLUMN emergency_name TEXT;
ALTER TABLE persons ADD COLUMN emergency_phone1 TEXT;
ALTER TABLE persons ADD COLUMN emergency_phone2 TEXT;
