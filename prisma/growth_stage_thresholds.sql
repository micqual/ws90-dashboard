-- ============================================================
-- Weather Wrangler: Growth Stage Thresholds
-- Run this once in your Railway PostgreSQL console
-- ============================================================

CREATE TABLE IF NOT EXISTS growth_stage_thresholds (
  id            serial PRIMARY KEY,
  crop_group    text NOT NULL,
  crop_type_id  integer REFERENCES crop_types(id) ON DELETE CASCADE,
  zadoks_code   text,
  stage_name    text NOT NULL,
  stage_icon    text NOT NULL,
  gdd_min       float NOT NULL,
  gdd_max       float NOT NULL,
  notes         text
);

CREATE INDEX IF NOT EXISTS idx_gst_crop_group ON growth_stage_thresholds(crop_group);
CREATE INDEX IF NOT EXISTS idx_gst_crop_type_id ON growth_stage_thresholds(crop_type_id);

-- ============================================================
-- WHEAT (base temp 0°C, grouped default for all wheat varieties)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('wheat', NULL, 'GS00', 'Germination',     '🌱', 0,    100,  'Seed imbibition to radicle emergence'),
('wheat', NULL, 'GS10', 'Emergence',        '🌿', 100,  200,  'Coleoptile through soil surface'),
('wheat', NULL, 'GS20', 'Tillering',        '🌾', 200,  500,  'Main shoot and tillers developing'),
('wheat', NULL, 'GS30', 'Stem Elongation',  '⬆️', 500,  700,  'First node detectable to flag leaf'),
('wheat', NULL, 'GS40', 'Booting',          '🎋', 700,  850,  'Flag leaf sheath extending, boot swelling'),
('wheat', NULL, 'GS50', 'Head Emergence',   '🌾', 850,  950,  'Spike emerging through flag leaf collar'),
('wheat', NULL, 'GS60', 'Flowering',        '🌸', 950,  1050, 'Anthesis — frost sensitive stage'),
('wheat', NULL, 'GS70', 'Grain Fill',       '🫘', 1050, 1350, 'Watery ripe through hard dough'),
('wheat', NULL, 'GS90', 'Ripening',         '🟡', 1350, 1500, 'Grain hardening, moisture loss'),
('wheat', NULL, 'GS99', 'Harvest Ready',    '🚜', 1500, 9999, 'Grain moisture ~12%, ready to harvest');

-- ============================================================
-- BARLEY (base temp 0°C — matures ~10–14 days faster than wheat)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('barley', NULL, 'GS00', 'Germination',     '🌱', 0,    90,   'Seed imbibition to radicle emergence'),
('barley', NULL, 'GS10', 'Emergence',        '🌿', 90,   180,  'Coleoptile through soil surface'),
('barley', NULL, 'GS20', 'Tillering',        '🌾', 180,  470,  'Main shoot and tillers developing'),
('barley', NULL, 'GS30', 'Stem Elongation',  '⬆️', 470,  650,  'First node to flag leaf visible'),
('barley', NULL, 'GS40', 'Booting',          '🎋', 650,  800,  'Flag leaf sheath extending'),
('barley', NULL, 'GS50', 'Head Emergence',   '🌾', 800,  880,  'Head emerging — flowering in boot'),
('barley', NULL, 'GS60', 'Flowering',        '🌸', 880,  950,  'Anthesis — frost sensitive stage'),
('barley', NULL, 'GS70', 'Grain Fill',       '🫘', 950,  1200, 'Watery ripe through hard dough'),
('barley', NULL, 'GS90', 'Ripening',         '🟡', 1200, 1350, 'Grain hardening, moisture loss'),
('barley', NULL, 'GS99', 'Harvest Ready',    '🚜', 1350, 9999, 'Grain moisture ~12%, ready to harvest');

-- ============================================================
-- CANOLA (base temp 5°C — different scale to cereals)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('canola', NULL, NULL,   'Germination',      '🌱', 0,    100,  'Seed imbibition to radicle emergence'),
('canola', NULL, NULL,   'Emergence',         '🌿', 100,  200,  'Cotyledons visible above soil'),
('canola', NULL, NULL,   'Rosette',           '🌿', 200,  400,  'True leaf development, rosette stage'),
('canola', NULL, NULL,   'Bolting',           '⬆️', 400,  600,  'Stem elongation, buds forming'),
('canola', NULL, NULL,   'Budding',           '🌼', 600,  750,  'Flower buds visible — frost risk'),
('canola', NULL, NULL,   'Flowering',         '🌼', 750,  900,  'Open flowers — critical frost risk'),
('canola', NULL, NULL,   'Pod Fill',          '🫘', 900,  1100, 'Pods elongating, seed development'),
('canola', NULL, NULL,   'Ripening',          '🟡', 1100, 1250, 'Pod colour change, seed hardening'),
('canola', NULL, NULL,   'Harvest Ready',     '🚜', 1250, 9999, 'Swathing or straight cut timing');

-- ============================================================
-- OATS (base temp 0°C — similar to barley, slightly slower)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('oats', NULL, 'GS00', 'Germination',        '🌱', 0,    100,  NULL),
('oats', NULL, 'GS10', 'Emergence',           '🌿', 100,  200,  NULL),
('oats', NULL, 'GS20', 'Tillering',           '🌾', 200,  500,  NULL),
('oats', NULL, 'GS30', 'Stem Elongation',     '⬆️', 500,  700,  NULL),
('oats', NULL, 'GS40', 'Booting',             '🎋', 700,  870,  NULL),
('oats', NULL, 'GS50', 'Head Emergence',      '🌾', 870,  970,  NULL),
('oats', NULL, 'GS60', 'Flowering',           '🌸', 970,  1070, NULL),
('oats', NULL, 'GS70', 'Grain Fill',          '🫘', 1070, 1400, NULL),
('oats', NULL, 'GS90', 'Ripening',            '🟡', 1400, 1600, NULL),
('oats', NULL, 'GS99', 'Harvest Ready',       '🚜', 1600, 9999, NULL);

-- ============================================================
-- CHICKPEAS (base temp 0°C)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('chickpeas', NULL, NULL, 'Germination',      '🌱', 0,    120,  NULL),
('chickpeas', NULL, NULL, 'Emergence',         '🌿', 120,  250,  NULL),
('chickpeas', NULL, NULL, 'Vegetative',        '🌿', 250,  600,  'Leaf and branch development'),
('chickpeas', NULL, NULL, 'Budding',           '🌼', 600,  800,  'Flower buds visible'),
('chickpeas', NULL, NULL, 'Flowering',         '🌼', 800,  1000, 'Open flowers — frost sensitive'),
('chickpeas', NULL, NULL, 'Pod Fill',          '🫘', 1000, 1300, 'Pod and seed development'),
('chickpeas', NULL, NULL, 'Ripening',          '🟡', 1300, 1600, 'Pod colour change'),
('chickpeas', NULL, NULL, 'Harvest Ready',     '🚜', 1600, 9999, NULL);

-- ============================================================
-- FABA BEANS (base temp 0°C)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('faba beans', NULL, NULL, 'Germination',     '🌱', 0,    130,  NULL),
('faba beans', NULL, NULL, 'Emergence',        '🌿', 130,  280,  NULL),
('faba beans', NULL, NULL, 'Vegetative',       '🌿', 280,  650,  'Leaf and stem development'),
('faba beans', NULL, NULL, 'Budding',          '🌼', 650,  850,  NULL),
('faba beans', NULL, NULL, 'Flowering',        '🌼', 850,  1050, 'Frost sensitive'),
('faba beans', NULL, NULL, 'Pod Fill',         '🫘', 1050, 1400, NULL),
('faba beans', NULL, NULL, 'Ripening',         '🟡', 1400, 1700, NULL),
('faba beans', NULL, NULL, 'Harvest Ready',    '🚜', 1700, 9999, NULL);

-- ============================================================
-- LUPINS (base temp 0°C)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('lupins', NULL, NULL, 'Germination',         '🌱', 0,    110,  NULL),
('lupins', NULL, NULL, 'Emergence',            '🌿', 110,  250,  NULL),
('lupins', NULL, NULL, 'Vegetative',           '🌿', 250,  600,  NULL),
('lupins', NULL, NULL, 'Budding',              '🌼', 600,  800,  NULL),
('lupins', NULL, NULL, 'Flowering',            '🌼', 800,  1000, 'Frost sensitive'),
('lupins', NULL, NULL, 'Pod Fill',             '🫘', 1000, 1300, NULL),
('lupins', NULL, NULL, 'Ripening',             '🟡', 1300, 1550, NULL),
('lupins', NULL, NULL, 'Harvest Ready',        '🚜', 1550, 9999, NULL);

-- ============================================================
-- LENTILS (base temp 0°C)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('lentils', NULL, NULL, 'Germination',        '🌱', 0,    100,  NULL),
('lentils', NULL, NULL, 'Emergence',           '🌿', 100,  220,  NULL),
('lentils', NULL, NULL, 'Vegetative',          '🌿', 220,  550,  NULL),
('lentils', NULL, NULL, 'Budding',             '🌼', 550,  750,  NULL),
('lentils', NULL, NULL, 'Flowering',           '🌼', 750,  950,  'Frost sensitive'),
('lentils', NULL, NULL, 'Pod Fill',            '🫘', 950,  1200, NULL),
('lentils', NULL, NULL, 'Ripening',            '🟡', 1200, 1450, NULL),
('lentils', NULL, NULL, 'Harvest Ready',       '🚜', 1450, 9999, NULL);

-- ============================================================
-- FIELD PEAS (base temp 0°C)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('field peas', NULL, NULL, 'Germination',     '🌱', 0,    110,  NULL),
('field peas', NULL, NULL, 'Emergence',        '🌿', 110,  240,  NULL),
('field peas', NULL, NULL, 'Vegetative',       '🌿', 240,  580,  NULL),
('field peas', NULL, NULL, 'Budding',          '🌼', 580,  780,  NULL),
('field peas', NULL, NULL, 'Flowering',        '🌼', 780,  980,  'Frost sensitive'),
('field peas', NULL, NULL, 'Pod Fill',         '🫘', 980,  1250, NULL),
('field peas', NULL, NULL, 'Ripening',         '🟡', 1250, 1500, NULL),
('field peas', NULL, NULL, 'Harvest Ready',    '🚜', 1500, 9999, NULL);

-- ============================================================
-- TRITICALE (base temp 0°C — similar to wheat)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('triticale', NULL, 'GS00', 'Germination',    '🌱', 0,    100,  NULL),
('triticale', NULL, 'GS10', 'Emergence',       '🌿', 100,  200,  NULL),
('triticale', NULL, 'GS20', 'Tillering',       '🌾', 200,  500,  NULL),
('triticale', NULL, 'GS30', 'Stem Elongation', '⬆️', 500,  700,  NULL),
('triticale', NULL, 'GS40', 'Booting',         '🎋', 700,  860,  NULL),
('triticale', NULL, 'GS50', 'Head Emergence',  '🌾', 860,  960,  NULL),
('triticale', NULL, 'GS60', 'Flowering',       '🌸', 960,  1060, NULL),
('triticale', NULL, 'GS70', 'Grain Fill',      '🫘', 1060, 1380, NULL),
('triticale', NULL, 'GS90', 'Ripening',        '🟡', 1380, 1530, NULL),
('triticale', NULL, 'GS99', 'Harvest Ready',   '🚜', 1530, 9999, NULL);

-- ============================================================
-- RYE (base temp 0°C)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('rye', NULL, 'GS00', 'Germination',           '🌱', 0,    90,   NULL),
('rye', NULL, 'GS10', 'Emergence',              '🌿', 90,   190,  NULL),
('rye', NULL, 'GS20', 'Tillering',              '🌾', 190,  480,  NULL),
('rye', NULL, 'GS30', 'Stem Elongation',        '⬆️', 480,  660,  NULL),
('rye', NULL, 'GS40', 'Booting',                '🎋', 660,  820,  NULL),
('rye', NULL, 'GS50', 'Head Emergence',         '🌾', 820,  920,  NULL),
('rye', NULL, 'GS60', 'Flowering',              '🌸', 920,  1020, NULL),
('rye', NULL, 'GS70', 'Grain Fill',             '🫘', 1020, 1300, NULL),
('rye', NULL, 'GS90', 'Ripening',               '🟡', 1300, 1450, NULL),
('rye', NULL, 'GS99', 'Harvest Ready',          '🚜', 1450, 9999, NULL);

-- ============================================================
-- VETCH (base temp 0°C — used as pasture/hay/brown manure)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('vetch', NULL, NULL, 'Germination',            '🌱', 0,    100,  NULL),
('vetch', NULL, NULL, 'Emergence',               '🌿', 100,  230,  NULL),
('vetch', NULL, NULL, 'Vegetative',              '🌿', 230,  600,  NULL),
('vetch', NULL, NULL, 'Flowering',               '🌼', 600,  900,  NULL),
('vetch', NULL, NULL, 'Pod Fill',                '🫘', 900,  1200, NULL),
('vetch', NULL, NULL, 'Harvest Ready',           '🚜', 1200, 9999, NULL);

-- ============================================================
-- LUCERNE (base temp 5°C — perennial, different growth cycle)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('lucerne', NULL, NULL, 'Regrowth',             '🌿', 0,    200,  'After cut or dormancy break'),
('lucerne', NULL, NULL, 'Vegetative',            '🌿', 200,  500,  'Stem and leaf development'),
('lucerne', NULL, NULL, 'Budding',               '🌼', 500,  700,  'Pre-bloom — optimal cut timing'),
('lucerne', NULL, NULL, 'Flowering',             '🌼', 700,  900,  '10% bloom — cut for best quality'),
('lucerne', NULL, NULL, 'Full Bloom',            '🌸', 900,  9999, 'Declining feed quality');

-- ============================================================
-- PASTURE / FALLOW / MISC (no GDD tracking — informational only)
-- ============================================================
INSERT INTO growth_stage_thresholds (crop_group, crop_type_id, zadoks_code, stage_name, stage_icon, gdd_min, gdd_max, notes) VALUES
('pasture',       NULL, NULL, 'Established',    '🌿', 0, 9999, NULL),
('fallow',        NULL, NULL, 'Fallow',         '🟤', 0, 9999, NULL),
('brown manure',  NULL, NULL, 'Growing',        '🌿', 0, 9999, NULL),
('hay',           NULL, NULL, 'Growing',        '🌾', 0, 9999, NULL),
('silage',        NULL, NULL, 'Growing',        '🌾', 0, 9999, NULL);

-- ============================================================
-- UPDATED growing_degree_days VIEW
-- Joins to thresholds to derive current stage automatically
-- Variety-specific rows (crop_type_id NOT NULL) take priority
-- over group defaults (crop_type_id IS NULL)
-- ============================================================
CREATE OR REPLACE VIEW growing_degree_days AS
WITH gdd_calc AS (
  SELECT
    s.id AS station_id,
    s.paddock_name,
    s.planted_date,
    s.crop_type_id,
    ct.target_gdd_harvest,
    ct.base_temp_gdd,
    ct.crop_name,
    LOWER(ct.crop_name) AS crop_group_key,
    COALESCE(
      SUM(
        GREATEST(0,
          ((wr.temperature_c) - COALESCE(ct.base_temp_gdd, 0))
        )
      ) / NULLIF(COUNT(wr.id), 0),
      0
    ) AS accumulated_gdd
  FROM stations s
  LEFT JOIN crop_types ct ON s.crop_type_id = ct.id
  LEFT JOIN weather_readings wr
    ON wr.station_id = s.id
    AND s.planted_date IS NOT NULL
    AND wr.created_at >= s.planted_date
  GROUP BY
    s.id, s.paddock_name, s.planted_date, s.crop_type_id,
    ct.target_gdd_harvest, ct.base_temp_gdd, ct.crop_name
),
stage_lookup AS (
  SELECT DISTINCT ON (g.station_id)
    g.station_id,
    g.accumulated_gdd,
    g.target_gdd_harvest,
    g.planted_date,
    g.crop_type_id,
    -- Variety-specific threshold takes priority (crop_type_id match)
    COALESCE(
      (SELECT t.stage_name FROM growth_stage_thresholds t
       WHERE t.crop_type_id = g.crop_type_id
         AND g.accumulated_gdd >= t.gdd_min
         AND g.accumulated_gdd < t.gdd_max
       LIMIT 1),
      (SELECT t.stage_name FROM growth_stage_thresholds t
       WHERE t.crop_type_id IS NULL
         AND t.crop_group = CASE
           WHEN g.crop_group_key LIKE '%wheat%' THEN 'wheat'
           WHEN g.crop_group_key LIKE '%barley%' THEN 'barley'
           WHEN g.crop_group_key LIKE '%canola%' THEN 'canola'
           WHEN g.crop_group_key LIKE '%oats%' OR g.crop_group_key LIKE '%oat%' THEN 'oats'
           WHEN g.crop_group_key LIKE '%chickpea%' THEN 'chickpeas'
           WHEN g.crop_group_key LIKE '%faba%' THEN 'faba beans'
           WHEN g.crop_group_key LIKE '%lupin%' THEN 'lupins'
           WHEN g.crop_group_key LIKE '%lentil%' THEN 'lentils'
           WHEN g.crop_group_key LIKE '%field pea%' OR g.crop_group_key LIKE '%peas%' THEN 'field peas'
           WHEN g.crop_group_key LIKE '%triticale%' THEN 'triticale'
           WHEN g.crop_group_key LIKE '%rye%' THEN 'rye'
           WHEN g.crop_group_key LIKE '%vetch%' THEN 'vetch'
           WHEN g.crop_group_key LIKE '%lucerne%' THEN 'lucerne'
           WHEN g.crop_group_key LIKE '%pasture%' THEN 'pasture'
           WHEN g.crop_group_key LIKE '%fallow%' THEN 'fallow'
           WHEN g.crop_group_key LIKE '%hay%' THEN 'hay'
           WHEN g.crop_group_key LIKE '%silage%' THEN 'silage'
           WHEN g.crop_group_key LIKE '%brown manure%' THEN 'brown manure'
           ELSE NULL
         END
         AND g.accumulated_gdd >= t.gdd_min
         AND g.accumulated_gdd < t.gdd_max
       LIMIT 1)
    ) AS stage_name,
    COALESCE(
      (SELECT t.stage_icon FROM growth_stage_thresholds t
       WHERE t.crop_type_id = g.crop_type_id
         AND g.accumulated_gdd >= t.gdd_min
         AND g.accumulated_gdd < t.gdd_max
       LIMIT 1),
      (SELECT t.stage_icon FROM growth_stage_thresholds t
       WHERE t.crop_type_id IS NULL
         AND t.crop_group = CASE
           WHEN g.crop_group_key LIKE '%wheat%' THEN 'wheat'
           WHEN g.crop_group_key LIKE '%barley%' THEN 'barley'
           WHEN g.crop_group_key LIKE '%canola%' THEN 'canola'
           WHEN g.crop_group_key LIKE '%oats%' OR g.crop_group_key LIKE '%oat%' THEN 'oats'
           WHEN g.crop_group_key LIKE '%chickpea%' THEN 'chickpeas'
           WHEN g.crop_group_key LIKE '%faba%' THEN 'faba beans'
           WHEN g.crop_group_key LIKE '%lupin%' THEN 'lupins'
           WHEN g.crop_group_key LIKE '%lentil%' THEN 'lentils'
           WHEN g.crop_group_key LIKE '%field pea%' OR g.crop_group_key LIKE '%peas%' THEN 'field peas'
           WHEN g.crop_group_key LIKE '%triticale%' THEN 'triticale'
           WHEN g.crop_group_key LIKE '%rye%' THEN 'rye'
           WHEN g.crop_group_key LIKE '%vetch%' THEN 'vetch'
           WHEN g.crop_group_key LIKE '%lucerne%' THEN 'lucerne'
           WHEN g.crop_group_key LIKE '%pasture%' THEN 'pasture'
           WHEN g.crop_group_key LIKE '%fallow%' THEN 'fallow'
           WHEN g.crop_group_key LIKE '%hay%' THEN 'hay'
           WHEN g.crop_group_key LIKE '%silage%' THEN 'silage'
           WHEN g.crop_group_key LIKE '%brown manure%' THEN 'brown manure'
           ELSE NULL
         END
         AND g.accumulated_gdd >= t.gdd_min
         AND g.accumulated_gdd < t.gdd_max
       LIMIT 1)
    ) AS stage_icon,
    COALESCE(
      (SELECT t.zadoks_code FROM growth_stage_thresholds t
       WHERE t.crop_type_id = g.crop_type_id
         AND g.accumulated_gdd >= t.gdd_min
         AND g.accumulated_gdd < t.gdd_max
       LIMIT 1),
      (SELECT t.zadoks_code FROM growth_stage_thresholds t
       WHERE t.crop_type_id IS NULL
         AND t.crop_group = CASE
           WHEN g.crop_group_key LIKE '%wheat%' THEN 'wheat'
           WHEN g.crop_group_key LIKE '%barley%' THEN 'barley'
           ELSE NULL END
         AND g.accumulated_gdd >= t.gdd_min
         AND g.accumulated_gdd < t.gdd_max
       LIMIT 1)
    ) AS zadoks_code
  FROM gdd_calc g
)
SELECT * FROM stage_lookup;
