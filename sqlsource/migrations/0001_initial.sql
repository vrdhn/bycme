-- Bycme initial relational database schema

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  total_docks INTEGER NOT NULL DEFAULT 10,
  available_bikes INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bikes (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL,
  bike_model TEXT NOT NULL,
  battery_level INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (station_id) REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  bike_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  start_station_id TEXT NOT NULL,
  end_station_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cost REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bike_id) REFERENCES bikes(id),
  FOREIGN KEY (start_station_id) REFERENCES stations(id),
  FOREIGN KEY (end_station_id) REFERENCES stations(id)
);

-- Seed initial stations
INSERT OR IGNORE INTO stations (id, name, latitude, longitude, total_docks, available_bikes)
VALUES
  ('st-central', 'Central Station', 37.7749, -122.4194, 20, 3),
  ('st-market', 'Market Street', 37.7891, -122.4014, 15, 2),
  ('st-pier', 'Pier 39', 37.8087, -122.4098, 12, 1);

-- Seed initial bikes
INSERT OR IGNORE INTO bikes (id, station_id, bike_model, battery_level, status)
VALUES
  ('bike-101', 'st-central', 'CityCruiser E-1', 95, 'available'),
  ('bike-102', 'st-central', 'CityCruiser E-1', 80, 'available'),
  ('bike-103', 'st-central', 'RoadMaster Pro', 65, 'available'),
  ('bike-201', 'st-market', 'CityCruiser E-1', 90, 'available'),
  ('bike-202', 'st-market', 'RoadMaster Pro', 85, 'available'),
  ('bike-301', 'st-pier', 'CityCruiser E-1', 100, 'available');
