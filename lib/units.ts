/** Convert m/s to km/h */
export function msToKmh(ms: number | null | undefined): number | null {
  if (ms == null) return null
  return Math.round(ms * 3.6 * 10) / 10
}



/** Calculate dew point from temperature and humidity (Magnus approximation) */
export function dewPoint(tempC: number | null | undefined, humidity: number | null | undefined): number | null {
  if (tempC == null || humidity == null) return null
  return Math.round((tempC - ((100 - humidity) / 5)) * 10) / 10
}

/** Format dew point */
export function formatDewPoint(tempC: number | null | undefined, humidity: number | null | undefined): string {
  const dp = dewPoint(tempC, humidity)
  if (dp == null) return '—'
  return `${dp}°C`
}
export function degToCompass(deg: number | null | undefined): string {
  if (deg == null) return '—'
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

/** Format temperature */
export function formatTemp(c: number | null | undefined): string {
  if (c == null) return '—'
  return `${c.toFixed(1)}°C`
}

/** Format wind speed */
export function formatWind(ms: number | null | undefined): string {
  const kmh = msToKmh(ms)
  if (kmh == null) return '—'
  return `${kmh} km/h`
}

/** Format rainfall in mm */
export function formatRain(mm: number | null | undefined): string {
  if (mm == null) return '—'
  return `${mm.toFixed(1)} mm`
}

/** Format battery voltage */
export function formatBattery(mv: number | null | undefined): string {
  if (mv == null) return '—'
  return `${(mv / 1000).toFixed(2)}V`
}

/** Battery percentage estimate (3.3V min, 4.2V max for LiPo) */
export function batteryPercent(mv: number | null | undefined): number {
  if (mv == null) return 0
  const min = 3300, max = 4200
  return Math.max(0, Math.min(100, Math.round(((mv - min) / (max - min)) * 100)))
}
