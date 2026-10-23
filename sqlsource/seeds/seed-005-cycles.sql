-- Seed 005: Baseline cycle fleets stationed across private residential parkings

INSERT INTO cycles (id, public_cycle_id, parking_id, company, model, colour, status, lock_code, qr_code)
VALUES
-- Gate 1 Residential Stand (Pune - Greenwood Heights) - Managed by Anita Desai
(
  'cyc-sample-001',
  'PUN-001',
  'prk-gw-gate1',
  'Hero',
  'Sprint Pro',
  'Matte Black',
  'Working',
  '4521',
  'w8Lm2XqP1oZ8wA2bC4dE9K'
),
(
  'cyc-sample-002',
  'PUN-002',
  'prk-gw-gate1',
  'Firefox',
  'Target 29',
  'Electric Blue',
  'Working',
  '7890',
  'm4K1P9qLoZ8wAbCdEf23Gh'
),
(
  'cyc-sample-003',
  'PUN-003',
  'prk-gw-gate1',
  'Btwin',
  'Rockrider ST30',
  'Racing Red',
  'Puncture',
  '1234',
  'x9Y8Z7wA6bC5dE4fG3hI2J'
),
(
  'cyc-sample-004',
  'PUN-004',
  'prk-gw-gate1',
  'Hercules',
  'Roadeo Hardliner',
  'Neon Yellow',
  'Broken',
  '9012',
  'k3L5M7nO9pQ1rS3tU5vW7X'
),
(
  'cyc-sample-005',
  'PUN-005',
  'prk-gw-gate1',
  'Trek',
  'Marlin 5',
  'Charcoal Grey',
  'Working',
  '3344',
  't5R7u9V1wX3yZ2aB4cD6eF'
),
(
  'cyc-sample-006',
  'PUN-006',
  'prk-gw-gate1',
  'Montra',
  'Madrock',
  'Forest Green',
  'Working',
  '8821',
  'p8Q2s4T6u8V0w1x3y5z7A9'
),

-- Clubhouse Stand (Pune - Greenwood Heights) - Managed by Vikram Joshi
(
  'cyc-sample-007',
  'PUN-007',
  'prk-gw-clubhouse',
  'Btwin',
  'Rockrider ST100',
  'Sport White',
  'Working',
  '5511',
  'v2B4n6M8p0R1t3V5x7Z9aC'
),
(
  'cyc-sample-008',
  'PUN-008',
  'prk-gw-clubhouse',
  'Hero',
  'Octane Dude',
  'Jet Black',
  'Working',
  '3322',
  'd4F6h8J0k2M4n6P8r0T2vX'
),

-- East Gate Stand (Bengaluru - Palm Meadows Enclave) - Managed by Suresh Reddy
(
  'cyc-sample-009',
  'BLR-001',
  'prk-palm-east',
  'Btwin',
  'Riverside 120',
  'Pearl White',
  'Working',
  '5678',
  'b1C3d5E7f9G2h4J6k8M0nP'
),
(
  'cyc-sample-010',
  'BLR-002',
  'prk-palm-east',
  'Firefox',
  'Tremor',
  'Lava Orange',
  'Working',
  '2468',
  'r2S4t6U8v0W1x3Y5z7A9bC'
),
(
  'cyc-sample-011',
  'BLR-003',
  'prk-palm-east',
  'Schnell',
  'Sierra',
  'Glossy Teal',
  'Puncture',
  '1357',
  'd4E6f8G0h2J4k6M8n0P2qR'
),

-- Sports Arena Stand (Bengaluru - Palm Meadows Enclave) - Managed by Priya Nair
(
  'cyc-sample-012',
  'BLR-004',
  'prk-palm-sports',
  'Trek',
  'FX 1 Disc',
  'Metallic Silver',
  'Working',
  '7744',
  'g9H1j3K5m7P9r1T3v5X7zB'
),
(
  'cyc-sample-013',
  'BLR-005',
  'prk-palm-sports',
  'Montra',
  'Trance Pro',
  'Matte Crimson',
  'Working',
  '9988',
  'j2K4m6P8r0T2v4X6z8B0dF'
),

-- Podium Level Stand (Hyderabad - My Home Bhooja) - Managed by Rahul Verma
(
  'cyc-sample-014',
  'HYD-001',
  'prk-bhooja-podium',
  'Scott',
  'Aspect 950',
  'Cobalt Blue',
  'Working',
  '9911',
  'e5F7g9H1j3K5m7N9p1Q3rS'
),
(
  'cyc-sample-015',
  'HYD-002',
  'prk-bhooja-podium',
  'Polygon',
  'Premier 4',
  'Silver Metallic',
  'Working',
  '4422',
  'g7H9j1K3m5N7p9Q1r3S5tU'
),
(
  'cyc-sample-016',
  'HYD-003',
  'prk-bhooja-podium',
  'Giant',
  'ATX 27.5',
  'Anthracite Grey',
  'Working',
  '6633',
  'k1M3p5R7t9V1x3Z5b7D9fH'
)
ON CONFLICT(id) DO UPDATE SET
  public_cycle_id = excluded.public_cycle_id,
  parking_id = excluded.parking_id,
  company = excluded.company,
  model = excluded.model,
  colour = excluded.colour,
  status = excluded.status,
  lock_code = excluded.lock_code,
  qr_code = excluded.qr_code;
