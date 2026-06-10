-- ============================================================
-- Weather Wrangler: Irrigation Events
-- Run in Railway console
-- ============================================================

CREATE TABLE IF NOT EXISTS irrigation_events (
  id            serial PRIMARY KEY,
  station_id    text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  irrigated_at  timestamptz NOT NULL DEFAULT NOW(),
  type          text NOT NULL DEFAULT 'overhead',
  amount_mm     float,
  duration_min  integer,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_irr_station ON irrigation_events(station_id);
CREATE INDEX IF NOT EXISTS idx_irr_time ON irrigation_events(irrigated_at DESC);

-- ============================================================
-- Updated disease_risk view — excludes rain from irrigation
-- events within 2h (overhead only)
-- ============================================================
CREATE OR REPLACE VIEW disease_risk AS
WITH latest AS (
  SELECT DISTINCT ON (station_id)
    station_id,
    temperature_c,
    humidity,
    wind_avg_ms * 3.6 AS wind_kmh,
    rain_mm,
    created_at
  FROM weather_readings
  ORDER BY station_id, created_at DESC
),
humid_hours_24h AS (
  SELECT
    station_id,
    COUNT(*) AS hours_humid
  FROM weather_readings wr
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND humidity > 85
    -- Exclude readings during overhead irrigation events
    AND NOT EXISTS (
      SELECT 1 FROM irrigation_events ie
      WHERE ie.station_id = wr.station_id
        AND ie.type = 'overhead'
        AND wr.created_at BETWEEN ie.irrigated_at - INTERVAL '15 minutes'
                                AND ie.irrigated_at + INTERVAL '2 hours'
    )
  GROUP BY station_id
),
rain_48h AS (
  SELECT
    station_id,
    COALESCE(SUM(rain_mm), 0) AS rain_last_48h
  FROM weather_readings wr
  WHERE created_at >= NOW() - INTERVAL '48 hours'
    -- Exclude rain readings during overhead irrigation events
    AND NOT EXISTS (
      SELECT 1 FROM irrigation_events ie
      WHERE ie.station_id = wr.station_id
        AND ie.type = 'overhead'
        AND wr.created_at BETWEEN ie.irrigated_at - INTERVAL '15 minutes'
                                AND ie.irrigated_at + INTERVAL '2 hours'
    )
  GROUP BY station_id
),
calcs AS (
  SELECT
    s.id AS station_id,
    s.paddock_name,
    l.temperature_c,
    l.humidity,
    l.wind_kmh,
    l.rain_mm,
    LOWER(ct.crop_name) AS crop_group,
    ct.crop_name,
    ROUND(
      (l.temperature_c - ((100 - l.humidity) / 5.0))::numeric, 1
    ) AS dew_point_c,
    COALESCE(h.hours_humid, 0) AS hours_humid_24h,
    COALESCE(r.rain_last_48h, 0) AS rain_last_48h,
    gdd.accumulated_gdd,
    gdd.stage_name AS gdd_stage,
    -- Was there recent overhead irrigation that might affect readings?
    EXISTS (
      SELECT 1 FROM irrigation_events ie
      WHERE ie.station_id = s.id
        AND ie.type = 'overhead'
        AND ie.irrigated_at >= NOW() - INTERVAL '4 hours'
    ) AS recent_overhead_irrigation
  FROM stations s
  LEFT JOIN crop_types ct ON s.crop_type_id = ct.id
  LEFT JOIN latest l ON l.station_id = s.id
  LEFT JOIN humid_hours_24h h ON h.station_id = s.id
  LEFT JOIN rain_48h r ON r.station_id = s.id
  LEFT JOIN growing_degree_days gdd ON gdd.station_id = s.id
)
SELECT
  station_id,
  paddock_name,
  crop_name,
  crop_group,
  temperature_c,
  humidity,
  dew_point_c,
  hours_humid_24h,
  rain_last_48h,
  recent_overhead_irrigation,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'PAUSED'
    WHEN temperature_c BETWEEN 5 AND 15 AND humidity > 90 AND hours_humid_24h >= 6 THEN 'HIGH'
    WHEN temperature_c BETWEEN 5 AND 18 AND humidity > 85 AND hours_humid_24h >= 3 THEN 'MODERATE'
    WHEN temperature_c BETWEEN 3 AND 18 AND humidity > 80 THEN 'LOW'
    ELSE 'LOW'
  END AS stripe_rust_risk,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'Risk paused — overhead irrigation in last 4h, readings excluded'
    WHEN temperature_c BETWEEN 5 AND 15 AND humidity > 90 AND hours_humid_24h >= 6 THEN 'Optimal stripe rust conditions — cool temp, high humidity, extended leaf wetness'
    WHEN temperature_c BETWEEN 5 AND 18 AND humidity > 85 AND hours_humid_24h >= 3 THEN 'Favourable stripe rust conditions — monitor crop closely'
    ELSE NULL
  END AS stripe_rust_reason,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'PAUSED'
    WHEN temperature_c BETWEEN 15 AND 30 AND humidity > 95 AND hours_humid_24h >= 4 THEN 'HIGH'
    WHEN temperature_c BETWEEN 15 AND 30 AND humidity > 90 AND hours_humid_24h >= 2 THEN 'MODERATE'
    WHEN temperature_c BETWEEN 12 AND 30 AND humidity > 85 THEN 'LOW'
    ELSE 'LOW'
  END AS stem_rust_risk,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'Risk paused — overhead irrigation in last 4h, readings excluded'
    WHEN temperature_c BETWEEN 15 AND 30 AND humidity > 95 AND hours_humid_24h >= 4 THEN 'High stem rust risk — warm, very humid conditions with extended wetness'
    WHEN temperature_c BETWEEN 15 AND 30 AND humidity > 90 AND hours_humid_24h >= 2 THEN 'Moderate stem rust risk — warm humid conditions, monitor flag leaf'
    ELSE NULL
  END AS stem_rust_reason,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'PAUSED'
    WHEN temperature_c BETWEEN 10 AND 30 AND humidity > 95 AND hours_humid_24h >= 6 THEN 'HIGH'
    WHEN temperature_c BETWEEN 10 AND 30 AND humidity > 90 AND hours_humid_24h >= 3 THEN 'MODERATE'
    WHEN temperature_c BETWEEN 8 AND 30 AND humidity > 85 THEN 'LOW'
    ELSE 'LOW'
  END AS leaf_rust_risk,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'Risk paused — overhead irrigation in last 4h, readings excluded'
    WHEN temperature_c BETWEEN 10 AND 30 AND humidity > 95 AND hours_humid_24h >= 6 THEN 'High leaf rust risk — broad temperature range, very high humidity and wetness'
    WHEN temperature_c BETWEEN 10 AND 30 AND humidity > 90 AND hours_humid_24h >= 3 THEN 'Moderate leaf rust risk — check lower canopy for early infection'
    ELSE NULL
  END AS leaf_rust_reason,

  CASE
    WHEN crop_group NOT LIKE '%canola%' AND crop_group NOT LIKE '%lentil%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'PAUSED'
    WHEN temperature_c BETWEEN 5 AND 20 AND humidity > 90 AND rain_last_48h > 5 AND hours_humid_24h >= 8 THEN 'HIGH'
    WHEN temperature_c BETWEEN 5 AND 22 AND humidity > 85 AND (rain_last_48h > 2 OR hours_humid_24h >= 6) THEN 'MODERATE'
    WHEN temperature_c BETWEEN 5 AND 25 AND humidity > 80 THEN 'LOW'
    ELSE 'LOW'
  END AS sclerotinia_risk,

  CASE
    WHEN crop_group NOT LIKE '%canola%' AND crop_group NOT LIKE '%lentil%' THEN NULL
    WHEN recent_overhead_irrigation THEN 'Risk paused — overhead irrigation in last 4h, readings excluded'
    WHEN temperature_c BETWEEN 5 AND 20 AND humidity > 90 AND rain_last_48h > 5 AND hours_humid_24h >= 8 THEN 'High sclerotinia risk — cool, wet, extended humidity. Critical if at flowering'
    WHEN temperature_c BETWEEN 5 AND 22 AND humidity > 85 AND (rain_last_48h > 2 OR hours_humid_24h >= 6) THEN 'Moderate sclerotinia risk — moist canopy conditions, monitor at flowering stage'
    ELSE NULL
  END AS sclerotinia_reason

FROM calcs;

-- ============================================================
-- Updated harvest_conditions view — flags recent irrigation
-- ============================================================
CREATE OR REPLACE VIEW harvest_conditions AS
WITH latest AS (
  SELECT DISTINCT ON (station_id)
    station_id,
    temperature_c,
    humidity,
    wind_avg_ms * 3.6 AS wind_kmh,
    rain_mm,
    created_at
  FROM weather_readings
  ORDER BY station_id, created_at DESC
),
rain_24h AS (
  SELECT
    station_id,
    COALESCE(SUM(rain_mm), 0) AS rain_last_24h
  FROM weather_readings wr
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM irrigation_events ie
      WHERE ie.station_id = wr.station_id
        AND ie.type = 'overhead'
        AND wr.created_at BETWEEN ie.irrigated_at - INTERVAL '15 minutes'
                                AND ie.irrigated_at + INTERVAL '2 hours'
    )
  GROUP BY station_id
),
recent_irr AS (
  SELECT
    station_id,
    MAX(irrigated_at) AS last_irrigated_at,
    SUM(CASE WHEN type = 'overhead' AND irrigated_at >= NOW() - INTERVAL '48 hours' THEN 1 ELSE 0 END) AS overhead_count_48h
  FROM irrigation_events
  WHERE irrigated_at >= NOW() - INTERVAL '48 hours'
  GROUP BY station_id
),
gdd_pct AS (
  SELECT
    station_id,
    accumulated_gdd,
    target_gdd_harvest,
    CASE WHEN target_gdd_harvest > 0
      THEN ROUND((accumulated_gdd / target_gdd_harvest * 100)::numeric, 1)
      ELSE 0
    END AS gdd_percent
  FROM growing_degree_days
)
SELECT
  s.id AS station_id,
  s.paddock_name,
  l.temperature_c,
  l.humidity,
  l.wind_kmh,
  l.rain_mm,
  r.rain_last_24h,
  g.gdd_percent,
  ri.last_irrigated_at,
  COALESCE(ri.overhead_count_48h, 0) AS overhead_irrigations_48h,
  LOWER(ct.crop_name) AS crop_group,
  CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 20 ELSE 25 END AS harvest_wind_limit,
  CASE
    WHEN g.gdd_percent < 85 THEN 'NOT READY'
    WHEN COALESCE(ri.overhead_count_48h, 0) > 0 THEN 'NOT SUITABLE'
    WHEN l.wind_kmh > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 20 ELSE 25 END THEN 'NOT SUITABLE'
    WHEN l.humidity > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 65 WHEN LOWER(ct.crop_name) LIKE '%lentil%' OR LOWER(ct.crop_name) LIKE '%chickpea%' THEN 60 ELSE 70 END THEN 'NOT SUITABLE'
    WHEN r.rain_last_24h > 5 THEN 'NOT SUITABLE'
    WHEN l.humidity > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 55 WHEN LOWER(ct.crop_name) LIKE '%lentil%' OR LOWER(ct.crop_name) LIKE '%chickpea%' THEN 50 ELSE 60 END THEN 'CAUTION'
    WHEN l.wind_kmh > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 15 ELSE 18 END THEN 'CAUTION'
    WHEN r.rain_last_24h > 1 THEN 'CAUTION'
    WHEN l.temperature_c < 10 THEN 'CAUTION'
    ELSE 'SUITABLE'
  END AS status,
  CASE
    WHEN g.gdd_percent < 85 THEN 'Crop not yet ready for harvest'
    WHEN COALESCE(ri.overhead_count_48h, 0) > 0 THEN 'Overhead irrigation in last 48h — allow drying time'
    WHEN l.wind_kmh > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 20 ELSE 25 END THEN 'Wind too high — header losses likely'
    WHEN l.humidity > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 65 WHEN LOWER(ct.crop_name) LIKE '%lentil%' OR LOWER(ct.crop_name) LIKE '%chickpea%' THEN 60 ELSE 70 END THEN 'Humidity too high — grain moisture risk'
    WHEN r.rain_last_24h > 5 THEN 'Recent rainfall — allow drying time'
    WHEN l.humidity > 60 THEN 'Humidity elevated — monitor conditions'
    WHEN l.wind_kmh > 15 THEN 'Wind elevated — watch for losses'
    WHEN r.rain_last_24h > 1 THEN 'Light recent rain — allow drying time'
    WHEN l.temperature_c < 10 THEN 'Cool conditions — slower grain drying'
    ELSE NULL
  END AS reason
FROM stations s
LEFT JOIN crop_types ct ON s.crop_type_id = ct.id
LEFT JOIN latest l ON l.station_id = s.id
LEFT JOIN rain_24h r ON r.station_id = s.id
LEFT JOIN recent_irr ri ON ri.station_id = s.id
LEFT JOIN gdd_pct g ON g.station_id = s.id;
