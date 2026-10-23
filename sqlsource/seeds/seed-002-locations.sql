-- Seed 002: Initial Cities, Buildings, and Parkings
-- Private indicates Residential facilities (manager eligible)
-- Public indicates Campus, Office, and Transit hubs (no manager)

INSERT INTO cities (id, name, state)
VALUES
  ('city-pune', 'Pune', 'Maharashtra'),
  ('city-blr', 'Bengaluru', 'Karnataka'),
  ('city-hyd', 'Hyderabad', 'Telangana')
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  state = excluded.state;

INSERT INTO buildings (id, city_id, name, building_type)
VALUES
  ('bld-greenwood-res', 'city-pune', 'Greenwood Heights Residential', 'Private'),
  ('bld-palm-meadows', 'city-blr', 'Palm Meadows Enclave', 'Private'),
  ('bld-my-home', 'city-hyd', 'My Home Bhooja Residential', 'Private'),
  ('bld-tech-park', 'city-pune', 'TechMahindra Innovation Park', 'Public'),
  ('bld-civic-center', 'city-blr', 'Indira Gandhi Civic Complex', 'Public'),
  ('bld-hitex', 'city-hyd', 'HITEX Exhibition Center', 'Public')
ON CONFLICT(id) DO UPDATE SET
  city_id = excluded.city_id,
  name = excluded.name,
  building_type = excluded.building_type;

INSERT INTO parkings (id, building_id, name, capacity)
VALUES
  ('prk-gw-gate1', 'bld-greenwood-res', 'Gate 1 Residential Stand', 20),
  ('prk-gw-clubhouse', 'bld-greenwood-res', 'Clubhouse Stand', 15),
  ('prk-palm-east', 'bld-palm-meadows', 'East Gate Stand', 25),
  ('prk-palm-sports', 'bld-palm-meadows', 'Sports Arena Stand', 15),
  ('prk-bhooja-podium', 'bld-my-home', 'Podium Level Stand', 20),
  ('prk-tm-tower-a', 'bld-tech-park', 'Tower A Docking Stand', 20),
  ('prk-tm-tower-b', 'bld-tech-park', 'Tower B Docking Stand', 15),
  ('prk-civic-metro', 'bld-civic-center', 'Civic Plaza Metro Stand', 30),
  ('prk-hitex-main', 'bld-hitex', 'HITEX Main Gate Stand', 25)
ON CONFLICT(id) DO UPDATE SET
  building_id = excluded.building_id,
  name = excluded.name,
  capacity = excluded.capacity;
