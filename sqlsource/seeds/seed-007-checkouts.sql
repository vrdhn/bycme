-- Seed 007: Sample Active Cycle Checkout
-- Kavita Sharma (rdr-001) actively checked out cyc-sample-001 at Gate 1 Stand (prk-gw-gate1)

INSERT INTO cycle_checkouts (id, cycle_id, person_id, parking_id, checked_out_at, status)
VALUES (
  'co-sample-001',
  'cyc-sample-001',
  'rdr-001',
  'prk-gw-gate1',
  datetime('now', '-35 minutes'),
  'active'
)
ON CONFLICT(id) DO UPDATE SET
  cycle_id = excluded.cycle_id,
  person_id = excluded.person_id,
  parking_id = excluded.parking_id,
  checked_out_at = excluded.checked_out_at,
  status = excluded.status;
