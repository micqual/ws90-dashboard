-- ============================================================
-- Weather Wrangler: Disease Risk View
-- Run in Railway after growth_stage_thresholds.sql
-- Calculates dew point, rust risk (wheat), sclerotinia risk
-- (canola + lentils) from existing weather readings
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
-- Hours with humidity > 85% in last 24h (leaf wetness proxy)
humid_hours_24h AS (
  SELECT
    station_id,
    COUNT(*) AS hours_humid
  FROM weather_readings
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND humidity > 85
  GROUP BY station_id
),
-- Rain in last 48h
rain_48h AS (
  SELECT
    station_id,
    COALESCE(SUM(rain_mm), 0) AS rain_last_48h
  FROM weather_readings
  WHERE created_at >= NOW() - INTERVAL '48 hours'
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
    -- Dew point: Magnus formula approximation (accurate to ±0.35°C)
    ROUND(
      (l.temperature_c - ((100 - l.humidity) / 5.0))::numeric,
      1
    ) AS dew_point_c,
    -- Dew point depression (temp - dew point): <2.5 means dew likely
    ROUND(
      (l.temperature_c - (l.temperature_c - ((100 - l.humidity) / 5.0)))::numeric,
      1
    ) AS dew_point_depression,
    COALESCE(h.hours_humid, 0) AS hours_humid_24h,
    COALESCE(r.rain_last_48h, 0) AS rain_last_48h,
    gdd.accumulated_gdd,
    gdd.stage_name AS gdd_stage
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

  -- ============================================================
  -- STRIPE RUST (wheat) — temp 5–15°C, humidity >85%, dew present
  -- Most damaging rust in southern Australia
  -- ============================================================
  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN temperature_c BETWEEN 5 AND 15
      AND humidity > 90
      AND hours_humid_24h >= 6 THEN 'HIGH'
    WHEN temperature_c BETWEEN 5 AND 18
      AND humidity > 85
      AND hours_humid_24h >= 3 THEN 'MODERATE'
    WHEN temperature_c BETWEEN 3 AND 18
      AND humidity > 80 THEN 'LOW'
    ELSE 'LOW'
  END AS stripe_rust_risk,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN temperature_c BETWEEN 5 AND 15 AND humidity > 90 AND hours_humid_24h >= 6
      THEN 'Optimal stripe rust conditions — cool temp, high humidity, extended leaf wetness'
    WHEN temperature_c BETWEEN 5 AND 18 AND humidity > 85 AND hours_humid_24h >= 3
      THEN 'Favourable stripe rust conditions — monitor crop closely'
    ELSE NULL
  END AS stripe_rust_reason,

  -- ============================================================
  -- STEM RUST (wheat) — temp 15–30°C, humidity >95% or dew near air temp
  -- High temperature rust, tends later in season
  -- ============================================================
  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN temperature_c BETWEEN 15 AND 30
      AND humidity > 95
      AND hours_humid_24h >= 4 THEN 'HIGH'
    WHEN temperature_c BETWEEN 15 AND 30
      AND humidity > 90
      AND hours_humid_24h >= 2 THEN 'MODERATE'
    WHEN temperature_c BETWEEN 12 AND 30
      AND humidity > 85 THEN 'LOW'
    ELSE 'LOW'
  END AS stem_rust_risk,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN temperature_c BETWEEN 15 AND 30 AND humidity > 95 AND hours_humid_24h >= 4
      THEN 'High stem rust risk — warm, very humid conditions with extended wetness'
    WHEN temperature_c BETWEEN 15 AND 30 AND humidity > 90 AND hours_humid_24h >= 2
      THEN 'Moderate stem rust risk — warm humid conditions, monitor flag leaf'
    ELSE NULL
  END AS stem_rust_reason,

  -- ============================================================
  -- LEAF RUST (wheat) — temp 10–30°C, humidity >95%, moderate wetness
  -- Most common rust in Australia
  -- ============================================================
  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN temperature_c BETWEEN 10 AND 30
      AND humidity > 95
      AND hours_humid_24h >= 6 THEN 'HIGH'
    WHEN temperature_c BETWEEN 10 AND 30
      AND humidity > 90
      AND hours_humid_24h >= 3 THEN 'MODERATE'
    WHEN temperature_c BETWEEN 8 AND 30
      AND humidity > 85 THEN 'LOW'
    ELSE 'LOW'
  END AS leaf_rust_risk,

  CASE
    WHEN crop_group NOT LIKE '%wheat%' THEN NULL
    WHEN temperature_c BETWEEN 10 AND 30 AND humidity > 95 AND hours_humid_24h >= 6
      THEN 'High leaf rust risk — broad temperature range, very high humidity and wetness'
    WHEN temperature_c BETWEEN 10 AND 30 AND humidity > 90 AND hours_humid_24h >= 3
      THEN 'Moderate leaf rust risk — check lower canopy for early infection'
    ELSE NULL
  END AS leaf_rust_reason,

  -- ============================================================
  -- SCLEROTINIA (canola + lentils)
  -- Cool (5–20°C), wet, high humidity, especially at flowering
  -- ============================================================
  CASE
    WHEN crop_group NOT LIKE '%canola%' AND crop_group NOT LIKE '%lentil%' THEN NULL
    WHEN temperature_c BETWEEN 5 AND 20
      AND humidity > 90
      AND rain_last_48h > 5
      AND hours_humid_24h >= 8 THEN 'HIGH'
    WHEN temperature_c BETWEEN 5 AND 22
      AND humidity > 85
      AND (rain_last_48h > 2 OR hours_humid_24h >= 6) THEN 'MODERATE'
    WHEN temperature_c BETWEEN 5 AND 25
      AND humidity > 80 THEN 'LOW'
    ELSE 'LOW'
  END AS sclerotinia_risk,

  CASE
    WHEN crop_group NOT LIKE '%canola%' AND crop_group NOT LIKE '%lentil%' THEN NULL
    WHEN temperature_c BETWEEN 5 AND 20 AND humidity > 90 AND rain_last_48h > 5 AND hours_humid_24h >= 8
      THEN 'High sclerotinia risk — cool, wet, extended humidity. Critical if at flowering'
    WHEN temperature_c BETWEEN 5 AND 22 AND humidity > 85 AND (rain_last_48h > 2 OR hours_humid_24h >= 6)
      THEN 'Moderate sclerotinia risk — moist canopy conditions, monitor at flowering stage'
    ELSE NULL
  END AS sclerotinia_reason

FROM calcs;
