-- Seed 005: Baseline cycle fleet stationed at prk-tm-tower-a

INSERT OR REPLACE INTO cycles (id, public_cycle_id, parking_id, company, model, colour, status, lock_code, qr_code)
VALUES
(
  'cyc-sample-001',
  'ABC-001',
  'prk-tm-tower-a',
  'Hero',
  'Sprint Pro',
  'Matte Black',
  'Working',
  '4521',
  'w8Lm2XqP1oZ8wA2bC4dE9K'
),
(
  'cyc-sample-002',
  'ABC-002',
  'prk-tm-tower-a',
  'Firefox',
  'Target 29',
  'Electric Blue',
  'Working',
  '7890',
  'm4K1P9qLoZ8wAbCdEf23Gh'
),
(
  'cyc-sample-003',
  'ABC-003',
  'prk-tm-tower-a',
  'Btwin',
  'Rockrider ST30',
  'Racing Red',
  'Puncture',
  '1234',
  'x9Y8Z7wA6bC5dE4fG3hI2J'
),
(
  'cyc-sample-004',
  'ABC-004',
  'prk-tm-tower-a',
  'Hercules',
  'Roadeo Hardliner',
  'Neon Yellow',
  'Broken',
  '9012',
  'k3L5M7nO9pQ1rS3tU5vW7X'
);
