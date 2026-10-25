-- Migration 0011: Ensure unique combination lock code per parking stand

CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_parking_lock_code ON cycles(parking_id, lock_code);
