import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchBomData } from '@/lib/bom-fetch'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Get all stations with BoM station selected
    const stations = await prisma.station.findMany({
      where: { bom_station_id: { not: null } },
      select: { id: true, bom_station_id: true },
    })

    let updated = 0
    const errors: string[] = []

    for (const station of stations) {
      if (!station.bom_station_id) continue

      try {
        const data = await fetchBomData(station.bom_station_id)
        
        if (data) {
          await prisma.station.update({
            where: { id: station.id },
            data: {
              bom_temp_c: data.temp_c,
              bom_humidity_pct: data.humidity_pct,
              bom_wind_speed_kmh: data.wind_speed_kmh,
              bom_wind_direction: data.wind_direction,
              bom_last_reading_time: data.timestamp,
            },
          })
          updated++
        }
      } catch (err: any) {
        errors.push(`${station.id}: ${err.message}`)
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({ 
      success: true, 
      updated, 
      total: stations.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('BoM fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
