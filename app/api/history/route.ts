import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const farmerId = (session.user as any).id
  const { searchParams } = new URL(request.url)
  const stationId = searchParams.get('stationId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!stationId || !from || !to) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const station = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId },
    include: { crop_type: true },
  })

  if (!station) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const daily = await prisma.$queryRaw`
    SELECT
      DATE(created_at AT TIME ZONE 'Australia/Adelaide') AS day,
      ROUND(MAX(rain_mm)::numeric, 2) AS rain_total,
      ROUND(MIN(temperature_c)::numeric, 1) AS temp_min,
      ROUND(MAX(temperature_c)::numeric, 1) AS temp_max,
      ROUND(AVG(temperature_c)::numeric, 1) AS temp_avg,
      ROUND(AVG(humidity)::numeric, 1) AS humidity_avg,
      ROUND(MAX(wind_avg_ms * 3.6)::numeric, 1) AS wind_max_kmh,
      COUNT(*) AS reading_count
    FROM weather_readings
    WHERE station_id = ${stationId}
      AND created_at >= ${new Date(from)}
      AND created_at <= ${new Date(to + 'T23:59:59')}
    GROUP BY DATE(created_at AT TIME ZONE 'Australia/Adelaide')
    ORDER BY day ASC
  `

  const rows = daily as any[]
  const totalRain = rows.reduce((sum, r) => sum + Number(r.rain_total ?? 0), 0)
  const avgTemp = rows.length > 0 ? rows.reduce((sum, r) => sum + Number(r.temp_avg ?? 0), 0) / rows.length : null
  const maxTemp = rows.length > 0 ? Math.max(...rows.map(r => Number(r.temp_max ?? -999))) : null
  const minTemp = rows.length > 0 ? Math.min(...rows.map(r => Number(r.temp_min ?? 999))) : null

  return NextResponse.json({
    station: { id: station.id, paddock_name: station.paddock_name, planted_date: station.planted_date, crop_type: station.crop_type },
    daily: rows.map(r => ({
      day: r.day,
      rain_total: Number(r.rain_total ?? 0),
      temp_min: r.temp_min !== null ? Number(r.temp_min) : null,
      temp_max: r.temp_max !== null ? Number(r.temp_max) : null,
      temp_avg: r.temp_avg !== null ? Number(r.temp_avg) : null,
      humidity_avg: r.humidity_avg !== null ? Number(r.humidity_avg) : null,
      wind_max_kmh: r.wind_max_kmh !== null ? Number(r.wind_max_kmh) : null,
      reading_count: Number(r.reading_count),
    })),
    summary: {
      total_rain_mm: Math.round(totalRain * 10) / 10,
      avg_temp: avgTemp !== null ? Math.round(avgTemp * 10) / 10 : null,
      max_temp: maxTemp,
      min_temp: minTemp,
      rainy_days: rows.filter(r => Number(r.rain_total) > 0.1).length,
      total_days: rows.length,
    },
  })
}
