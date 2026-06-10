-- ============================================================
-- Weather Wrangler: Harvest Conditions View
-- Add to Railway after growth_stage_thresholds.sql
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
  FROM weather_readings
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY station_id
),
gdd_pct AS (
  SELECT
    station_id,
    accumulated_gdd,
    target_gdd_harvest,
    CASE
      WHEN target_gdd_harvest > 0
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
  LOWER(ct.crop_name) AS crop_group,
  -- Wind limit varies by crop: canola 20 km/h, cereals 25 km/h
  CASE
    WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 20
    ELSE 25
  END AS harvest_wind_limit,
  -- Humidity limit varies by crop
  CASE
    WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 65
    WHEN LOWER(ct.crop_name) LIKE '%lentil%' OR LOWER(ct.crop_name) LIKE '%chickpea%' THEN 60
    ELSE 70
  END AS harvest_humidity_limit,
  -- Status determination
  CASE
    -- Not near harvest yet (< 85% GDD) — don't show harvest status
    WHEN g.gdd_percent < 85 THEN 'NOT READY'
    -- Hard block conditions
    WHEN l.wind_kmh > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 20 ELSE 25 END THEN 'NOT SUITABLE'
    WHEN l.humidity > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 65 WHEN LOWER(ct.crop_name) LIKE '%lentil%' OR LOWER(ct.crop_name) LIKE '%chickpea%' THEN 60 ELSE 70 END THEN 'NOT SUITABLE'
    WHEN r.rain_last_24h > 5 THEN 'NOT SUITABLE'
    -- Caution conditions
    WHEN l.humidity > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 55 WHEN LOWER(ct.crop_name) LIKE '%lentil%' OR LOWER(ct.crop_name) LIKE '%chickpea%' THEN 50 ELSE 60 END THEN 'CAUTION'
    WHEN l.wind_kmh > CASE WHEN LOWER(ct.crop_name) LIKE '%canola%' THEN 15 ELSE 18 END THEN 'CAUTION'
    WHEN r.rain_last_24h > 1 THEN 'CAUTION'
    WHEN l.temperature_c < 10 THEN 'CAUTION'
    -- All good
    ELSE 'SUITABLE'
  END AS status,
  -- Human-readable reason for non-suitable
  CASE
    WHEN g.gdd_percent < 85 THEN 'Crop not yet ready for harvest'
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
LEFT JOIN gdd_pct g ON g.station_id = s.id;
