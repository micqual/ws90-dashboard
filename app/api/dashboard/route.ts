import '@/lib/bigint'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const farmerId = (session.user as any).id
    const tier = (session.user as any).tier ?? 'base'

    const stations = await prisma.station.findMany({
      where: { farmer_id: farmerId },
      include: {
        crop_type: true,
        weather_readings: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { paddock_name: 'asc' },
    })

    const stationIds = stations.map(s => s.id)

    let sprayConditions: any[] = []
    let gddData: any[] = []
    let frostRisk: any[] = []
    let harvestConditions: any[] = []
    let diseaseRisk: any[] = []
    let irrigationEvents: any[] = []
    let todayRain: any[] = []

    if (stationIds.length > 0) {
      // Today's rainfall since midnight (Australian Central Time)
      try {
        todayRain = await prisma.$queryRaw`
          SELECT
            station_id,
            ROUND(MAX(rain_mm)::numeric, 2) AS rain_today_mm
          FROM weather_readings
          WHERE station_id = ANY(${stationIds}::text[])
            AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Australia/Adelaide') AT TIME ZONE 'Australia/Adelaide'
          GROUP BY station_id
        `
      } catch (e) {
        console.error('today rain error:', e)
      }

      try {
        sprayConditions = await prisma.$queryRaw`
          SELECT * FROM spray_conditions
          WHERE station_id = ANY(${stationIds}::text[])
        `
      } catch (e) {
        console.error('spray_conditions view error:', e)
      }

      if (tier === 'pro') {
        try {
          gddData = await prisma.$queryRaw`
            SELECT * FROM growing_degree_days
            WHERE station_id = ANY(${stationIds}::text[])
          `
        } catch (e) {
          console.error('growing_degree_days view error:', e)
        }

        try {
          frostRisk = await prisma.$queryRaw`
            SELECT * FROM frost_risk
            WHERE station_id = ANY(${stationIds}::text[])
          `
        } catch (e) {
          console.error('frost_risk view error:', e)
        }

        try {
          harvestConditions = await prisma.$queryRaw`
            SELECT * FROM harvest_conditions
            WHERE station_id = ANY(${stationIds}::text[])
          `
        } catch (e) {
          console.error('harvest_conditions view error:', e)
        }

        try {
          diseaseRisk = await prisma.$queryRaw`
            SELECT * FROM disease_risk
            WHERE station_id = ANY(${stationIds}::text[])
          `
        } catch (e) {
          console.error('disease_risk view error:', e)
        }
      }

      try {
        irrigationEvents = await prisma.$queryRaw`
          SELECT DISTINCT ON (station_id)
            station_id, irrigated_at, type, amount_mm, duration_min
          FROM irrigation_events
          WHERE station_id = ANY(${stationIds}::text[])
            AND irrigated_at >= NOW() - INTERVAL '7 days'
          ORDER BY station_id, irrigated_at DESC
        `
      } catch (e) {
        console.error('irrigation_events error:', e)
      }
    }

    const sprayMap = Object.fromEntries(sprayConditions.map((r: any) => [r.station_id, r]))
    const gddMap = Object.fromEntries(gddData.map((r: any) => [r.station_id, r]))
    const frostMap = Object.fromEntries(frostRisk.map((r: any) => [r.station_id, r]))
    const harvestMap = Object.fromEntries(harvestConditions.map((r: any) => [r.station_id, r]))
    const diseaseMap = Object.fromEntries(diseaseRisk.map((r: any) => [r.station_id, r]))
    const irrigationMap = Object.fromEntries(irrigationEvents.map((r: any) => [r.station_id, r]))
    const rainMap = Object.fromEntries(todayRain.map((r: any) => [r.station_id, Number(r.rain_today_mm ?? 0)]))

    const result = stations.map(station => ({
      ...station,
      latest_reading: station.weather_readings[0]
        ? {
            ...station.weather_readings[0],
            rain_mm: rainMap[station.id] ?? 0,
          }
        : null,
      spray_condition: sprayMap[station.id] ?? null,
      gdd: gddMap[station.id] ?? null,
      frost: frostMap[station.id] ?? null,
      harvest: harvestMap[station.id] ?? null,
      disease: diseaseMap[station.id] ?? null,
      last_irrigation: irrigationMap[station.id] ?? null,
    }))

    return NextResponse.json({ stations: result, tier })
  } catch (e: any) {
    console.error('Dashboard API error:', e)
    return NextResponse.json({ error: e.message, stations: [], tier: 'base' }, { status: 500 })
  }
}
