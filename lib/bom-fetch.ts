import { BOM_STATIONS } from './bom-stations'

interface BomObservation {
  temp_c: number | null
  humidity_pct: number | null
  wind_speed_kmh: number | null
  wind_direction: string | null
  timestamp: Date
}

export async function fetchBomData(stationId: string): Promise<BomObservation | null> {
  try {
    const station = BOM_STATIONS.find(s => s.id === stationId)
    if (!station) return null

    // Bureau of Meteorology public XML feed
    const url = `http://www.bom.gov.au/fwo/${stationId}.xml`
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 'Accept': 'application/xml' }
    })

    if (!response.ok) {
      console.error(`BoM fetch failed for ${stationId}: ${response.status}`)
      return null
    }

    const xml = await response.text()
    
    // Parse XML manually (no XML parser in runtime)
    const tempMatch = xml.match(/<air_temperature>([\d.]+)<\/air_temperature>/)
    const humidityMatch = xml.match(/<relative_humidity>([\d.]+)<\/relative_humidity>/)
    const windSpeedMatch = xml.match(/<wind_spd_kmh>([\d.]+)<\/wind_spd_kmh>/)
    const windDirMatch = xml.match(/<wind_dir>(\w+)<\/wind_dir>/)
    const timeMatch = xml.match(/<observation_time_local>([\dT\-:]+)<\/observation_time_local>/)

    return {
      temp_c: tempMatch ? parseFloat(tempMatch[1]) : null,
      humidity_pct: humidityMatch ? parseFloat(humidityMatch[1]) : null,
      wind_speed_kmh: windSpeedMatch ? parseFloat(windSpeedMatch[1]) : null,
      wind_direction: windDirMatch ? windDirMatch[1] : null,
      timestamp: timeMatch ? new Date(timeMatch[1]) : new Date(),
    }
  } catch (error) {
    console.error(`Error fetching BoM data for ${stationId}:`, error)
    return null
  }
}

export async function fetchAllBomData() {
  const results: Record<string, BomObservation | null> = {}
  
  for (const station of BOM_STATIONS) {
    results[station.id] = await fetchBomData(station.id)
    // Rate limit: 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}
