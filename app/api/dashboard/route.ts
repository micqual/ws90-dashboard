import '@/lib/bigint'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Haversine distance in km
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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

    const realStations = stations.filter(s => !(s as any).is_virtual && s.latitude != null && s.longitude != null)

    // Map: virtual station id -> { nearestStationId, distanceKm }
    const nearestStationMap: Record<string, { id: string; distanceKm: number; paddockName: string | null }> = {}

    for (const station of stations) {
      if ((station as any).is_virtual && station.latitude != null && station.longitude != null) {
        let best: { id: string; distanceKm: number; paddockName: string | null } | null = null
        for (const real of realStations) {
          const d = distanceKm(station.latitude, station.longitude, real.latitude!, real.longitude!)
          if (d <= 5 && (!best || d < best.distanceKm)) {
            best = { id: real.id, distanceKm: d, paddockName: real.paddock_name }
          }
        }
        if (best) nearestStationMap[station.id] = best
      }
    }

    const stationIds = stations.map(s => s.id)
    // Include borrowed real station IDs so their weather views get fetched too
    const borrowedIds = Object.values(nearestStationMap).map(v => v.id)
    const allLookupIds = Array.from(new Set([...stationIds, ...borrowedIds]))

    let sprayConditions: any[] = []
    let gddData: any[] = []
    let frostRisk: any[] = []
    let harvestConditions: any[] = []
    let diseaseRisk: any[] = []
    let irrigationEvents: any[] = []
    let todayRain: any[] = []
    let dryingConditions: any[] = []

    if (stationIds.length > 0) {
      try {
        todayRain = await prisma.$queryRaw`
          SELECT
            station_id,
            ROUND(SUM(CASE WHEN rain_diff > 0 THEN rain_diff ELSE 0 END)::numeric, 2) AS rain_today_mm
          FROM (
            SELECT
              station_id,
              rain_mm - LAG(rain_mm) OVER (PARTITION BY station_id ORDER BY created_at) AS rain_diff
            FROM weather_readings
            WHERE station_id = ANY(${allLookupIds}::text[])
              AND created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Australia/Adelaide') AT TIME ZONE 'Australia/Adelaide'
          ) diffs
          GROUP BY station_id
        `
      } catch (e) {
        console.error('today rain error:', e)
      }

      try {
        sprayConditions = await prisma.$queryRaw`
          SELECT * FROM spray_conditions
          WHERE station_id = ANY(${allLookupIds}::text[])
        `
      } catch (e) {
        console.error('spray_conditions view error:', e)
      }

      if (tier === 'pro') {
        try {
          gddData = await prisma.$queryRaw`
            SELECT * FROM growing_degree_days
            WHERE station_id = ANY(${allLookupIds}::text[])
          `
        } catch (e) {
          console.error('growing_degree_days view error:', e)
        }

        try {
          frostRisk = await prisma.$queryRaw`
            SELECT * FROM frost_risk
            WHERE station_id = ANY(${allLookupIds}::text[])
          `
        } catch (e) {
          console.error('frost_risk view error:', e)
        }

        try {
          harvestConditions = await prisma.$queryRaw`
            SELECT * FROM harvest_conditions
            WHERE station_id = ANY(${allLookupIds}::text[])
          `
        } catch (e) {
          console.error('harvest_conditions view error:', e)
        }

        try {
          diseaseRisk = await prisma.$queryRaw`
            SELECT * FROM disease_risk
            WHERE station_id = ANY(${allLookupIds}::text[])
          `
        } catch (e) {
          console.error('disease_risk view error:', e)
        }

        try {
          dryingConditions = await prisma.$queryRaw`
            SELECT * FROM drying_conditions
            WHERE station_id = ANY(${allLookupIds}::text[])
          `
        } catch (e) {
          console.error('drying_conditions view error:', e)
        }
      }

      try {
        irrigationEvents = await prisma.$queryRaw`
          SELECT DISTINCT ON (station_id)
            station_id, irrigated_at, type, amount_mm, duration_min
          FROM irrigation_events
          WHERE station_id = ANY(${allLookupIds}::text[])
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
    const dryingMap = Object.fromEntries(dryingConditions.map((r: any) => [r.station_id, r]))

    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } })

    const result = stations.map(station => {
      // For virtual stations, use borrowed real station's weather data
      const dataSourceId = (station as any).is_virtual && nearestStationMap[station.id]
        ? nearestStationMap[station.id].id
        : station.id
      const borrowed = (station as any).is_virtual && nearestStationMap[station.id]
        ? nearestStationMap[station.id]
        : null

      return {
        ...station,
        latest_reading: station.weather_readings[0]
          ? { ...station.weather_readings[0], rain_mm: rainMap[dataSourceId] ?? 0 }
          : null,
        spray_condition: sprayMap[dataSourceId] ?? null,
        gdd: gddMap[dataSourceId] ?? null,
        frost: frostMap[dataSourceId] ?? null,
      harvest: harvestMap[dataSourceId] ?? null,
      disease: diseaseMap[dataSourceId] ?? null,
      last_irrigation: irrigationMap[dataSourceId] ?? null,
      drying: dryingMap[dataSourceId] ?? null,
      agronomist_name: farmer?.agronomist_name,
      agronomist_company: farmer?.agronomist_company,
      agronomist_phone: farmer?.agronomist_phone,
      borrowed_from: borrowed ? { station_id: borrowed.id, paddock_name: borrowed.paddockName, distance_km: Number(borrowed.distanceKm.toFixed(1)) } : null,
    }
    })

    return NextResponse.json({ stations: result, tier })
  } catch (e: any) {
    console.error('Dashboard API error:', e)
    return NextResponse.json({ error: e.message, stations: [], tier: 'base' }, { status: 500 })
  }
}
