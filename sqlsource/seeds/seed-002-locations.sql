-- Seed 002: Initial Cities, Buildings, and Parkings

INSERT OR REPLACE INTO cities (id, name, state)
VALUES
  ('city-pune', 'Pune', 'Maharashtra'),
  ('city-blr', 'Bengaluru', 'Karnataka'),
  ('city-hyd', 'Hyderabad', 'Telangana');

INSERT OR REPLACE INTO buildings (id, city_id, name, building_type)
VALUES
  ('bld-tech-park', 'city-pune', 'TechMahindra Innovation Park', 'Private'),
  ('bld-civic-center', 'city-blr', 'Indira Gandhi Civic Complex', 'Public'),
  ('bld-hitex', 'city-hyd', 'HITEX Exhibition Center', 'Public');

INSERT OR REPLACE INTO parkings (id, building_id, name, capacity)
VALUES
  ('prk-tm-tower-a', 'bld-tech-park', 'Tower A Docking Stand', 20),
  ('prk-tm-tower-b', 'bld-tech-park', 'Tower B Docking Stand', 15),
  ('prk-civic-metro', 'bld-civic-center', 'Civic Plaza Metro Stand', 30),
  ('prk-hitex-main', 'bld-hitex', 'HITEX Main Gate Stand', 25);
