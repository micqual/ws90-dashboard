CREATE TABLE IF NOT EXISTS nitrogen_soil_tests (
  id            serial PRIMARY KEY,
  station_id    text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  tested_at     date NOT NULL DEFAULT CURRENT_DATE,
  depth_cm      integer NOT NULL DEFAULT 60,
  no3_n_kg_ha   float NOT NULL,
  nh4_n_kg_ha   float DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nst_station ON nitrogen_soil_tests(station_id);

CREATE TABLE IF NOT EXISTS nitrogen_applications (
  id            serial PRIMARY KEY,
  station_id    text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  applied_at    date NOT NULL DEFAULT CURRENT_DATE,
  product       text NOT NULL,
  rate_kg_ha    float NOT NULL,
  n_kg_ha       float NOT NULL,
  method        text DEFAULT 'broadcast',
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_na_station ON nitrogen_applications(station_id);

CREATE TABLE IF NOT EXISTS nitrogen_products (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  n_percent  float NOT NULL,
  notes      text
);

INSERT INTO nitrogen_products (name, n_percent, notes) VALUES
('Urea', 46.0, 'Most common solid N fertiliser'),
('DAP', 18.0, 'Diammonium phosphate'),
('MAP', 10.0, 'Monoammonium phosphate'),
('UAN', 32.0, 'Urea ammonium nitrate solution'),
('Ammonium Sulfate', 21.0, 'Also contains 24% S'),
('Ammonium Nitrate', 34.0, 'High analysis N'),
('Calcium Ammonium Nitrate', 27.0, 'CAN'),
('Anhydrous Ammonia', 82.0, 'Highest analysis'),
('Chicken Manure', 3.5, 'Approximate'),
('Other', 0.0, 'Enter actual N% manually')
ON CONFLICT DO NOTHING;
