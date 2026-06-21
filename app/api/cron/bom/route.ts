import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify the cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Call the bom/fetch endpoint directly instead of via HTTP
    // to avoid DATABASE_URL environment issues
    const { prisma } = await import('@/lib/prisma')
    const { fetchBomData } = await import('@/lib/bom-fetch')
    
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

    const res = {
      success: true,
      data: { updated, total: stations.length, errors: errors.length > 0 ? errors : undefined }
    }

    return NextResponse.json(res)
  } catch (error: any) {
    console.error('Cron BoM fetch failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
