-- Sample view definitions for WS90 dashboard
-- These may already exist in your Railway database.
-- Adjust column names to match your actual schema.

-- Spray conditions view
CREATE OR REPLACE VIEW spray_conditions AS
SELECT
  s.id AS station_id,
  s.paddock_name,
  wr.temperature_c,
  wr.humidity,
  wr.wind_avg_ms * 3.6 AS wind_speed_kmh,
  CASE
    WHEN wr.wind_avg_ms * 3.6 > COALESCE(s.spray_wind_override, ct.spray_wind_limit_kmh, 15) THEN 'NOT SUITABLE'
    WHEN wr.humidity > COALESCE(ct.spray_humidity_max, 95) THEN 'NOT SUITABLE'
    WHEN wr.humidity < COALESCE(ct.spray_humidity_min, 30) THEN 'CAUTION'
    WHEN wr.temperature_c < COALESCE(ct.spray_temp_min, 5) THEN 'NOT SUITABLE'
    WHEN wr.temperature_c > COALESCE(ct.spray_temp_max, 30) THEN 'NOT SUITABLE'
    WHEN wr.wind_avg_ms * 3.6 > COALESCE(s.spray_wind_override, ct.spray_wind_limit_kmh, 15) * 0.8 THEN 'CAUTION'
    ELSE 'SUITABLE'
  END AS status,
  wr.created_at AS reading_time
FROM stations s
LEFT JOIN crop_types ct ON s.crop_type_id = ct.id
LEFT JOIN LATERAL (
  SELECT * FROM weather_readings
  WHERE station_id = s.id
  ORDER BY created_at DESC
  LIMIT 1
) wr ON true;

-- Growing degree days view
CREATE OR REPLACE VIEW growing_degree_days AS
SELECT
  s.id AS station_id,
  s.paddock_name,
  s.planted_date,
  ct.target_gdd_harvest,
  ct.base_temp_gdd,
  COALESCE(SUM(
    GREATEST(0, ((wr.temperature_c) - COALESCE(ct.base_temp_gdd, 10)))
  ) / COUNT(wr.id), 0) AS accumulated_gdd
FROM stations s
LEFT JOIN crop_types ct ON s.crop_type_id = ct.id
LEFT JOIN weather_readings wr ON wr.station_id = s.id
  AND s.planted_date IS NOT NULL
  AND wr.created_at >= s.planted_date
GROUP BY s.id, s.paddock_name, s.planted_date, ct.target_gdd_harvest, ct.base_temp_gdd;

-- Frost risk view
CREATE OR REPLACE VIEW frost_risk AS
SELECT
  s.id AS station_id,
  s.paddock_name,
  wr.temperature_c AS min_temp_c,
  ct.frost_critical_stage AS critical_stage,
  CASE
    WHEN wr.temperature_c < COALESCE(s.frost_temp_override, ct.frost_alert_temp, 2) - 2 THEN 'CRITICAL'
    WHEN wr.temperature_c < COALESCE(s.frost_temp_override, ct.frost_alert_temp, 2) THEN 'HIGH'
    WHEN wr.temperature_c < COALESCE(s.frost_temp_override, ct.frost_alert_temp, 2) + 2 THEN 'MEDIUM'
    ELSE 'LOW'
  END AS frost_risk
FROM stations s
LEFT JOIN crop_types ct ON s.crop_type_id = ct.id
LEFT JOIN LATERAL (
  SELECT MIN(temperature_c) AS temperature_c
  FROM weather_readings
  WHERE station_id = s.id
    AND created_at >= NOW() - INTERVAL '12 hours'
) wr ON true;
