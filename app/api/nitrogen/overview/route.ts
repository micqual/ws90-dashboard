import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const N_PER_TONNE: Record<string, number> = {
  wheat: 40, barley: 35, canola: 60, oats: 30,
  chickpeas: -80, lentils: -60, lupins: -100, 'faba beans': -80, 'field peas': -60,
  default: 40,
}

const YIELD_BY_DECILE: Record<string, number[]> = {
  wheat:   [0.7, 1.5, 2.8, 4.2, 5.7],
  barley:  [0.8, 1.6, 3.0, 4.5, 6.0],
  canola:  [0.3, 0.7, 1.4, 2.0, 2.8],
  oats:    [0.7, 1.5, 2.8, 4.0, 5.5],
  default: [0.7, 1.5, 2.5, 4.0, 5.5],
}

const LEACH_RATES: Record<string, { high: number; mod: number; low: number }> = {
  sand:          { high: 0.45, mod: 0.25, low: 0.10 },
  'sandy loam':  { high: 0.35, mod: 0.20, low: 0.08 },
  loam:          { high: 0.20, mod: 0.12, low: 0.05 },
  'clay loam':   { high: 0.12, mod: 0.08, low: 0.03 },
  clay:          { high: 0.08, mod: 0.05, low: 0.02 },
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const farmerId = (session.user as any).id

  const stations = await prisma.station.findMany({
    where: { farmer_id: farmerId },
    include: { crop_type: true },
    orderBy: { paddock_name: 'asc' },
  })

  const results = await Promise.all(stations.map(async station => {
    const seasonStart = station.planted_date
      ? new Date(station.planted_date)
      : new Date(new Date().getFullYear(), 3, 1)

    const soilTests = await prisma.$queryRaw`
      SELECT no3_n_kg_ha, nh4_n_kg_ha FROM nitrogen_soil_tests
      WHERE station_id = ${station.id}
      ORDER BY tested_at DESC LIMIT 1
    ` as any[]
    const soilN = soilTests[0]
      ? Number(soilTests[0].no3_n_kg_ha) + Number(soilTests[0].nh4_n_kg_ha ?? 0)
      : 0

    const apps = await prisma.$queryRaw`
      SELECT COALESCE(SUM(n_kg_ha), 0) AS total FROM nitrogen_applications
      WHERE station_id = ${station.id} AND applied_at >= ${seasonStart}
    ` as any[]
    const appliedN = Number(apps[0]?.total ?? 0)

    let seasonRainMm = 0
    try {
      const rain = await prisma.$queryRaw`
        SELECT COALESCE(SUM(CASE WHEN rain_diff > 0 THEN rain_diff ELSE 0 END), 0) AS season_rain
        FROM (SELECT rain_mm - LAG(rain_mm) OVER (ORDER BY created_at) AS rain_diff
              FROM weather_readings WHERE station_id = ${station.id} AND created_at >= ${seasonStart}) d
      ` as any[]
      seasonRainMm = Number(rain[0]?.season_rain ?? 0)
    } catch (e) {}

    const soilType = (station.soil_type ?? 'loam').toLowerCase()
    const leachRate = LEACH_RATES[soilType] ?? LEACH_RATES.loam
    let leachingLoss = 0
    if (seasonRainMm > 300) leachingLoss = soilN * leachRate.high
    else if (seasonRainMm > 150) leachingLoss = soilN * leachRate.mod
    else leachingLoss = soilN * leachRate.low

    let gddPercent = 0
    try {
      const gdd = await prisma.$queryRaw`
        SELECT accumulated_gdd, target_gdd_harvest FROM growing_degree_days
        WHERE station_id = ${station.id}
      ` as any[]
      if (gdd[0]?.target_gdd_harvest > 0) {
        gddPercent = Math.min(100, (Number(gdd[0].accumulated_gdd) / Number(gdd[0].target_gdd_harvest)) * 100)
      }
    } catch (e) {}

    const cropGroup = Object.keys(N_PER_TONNE).find(k =>
      station.crop_type?.crop_name?.toLowerCase().includes(k)
    ) ?? 'default'
    const nPerTonne = N_PER_TONNE[cropGroup]
    const yieldDeciles = YIELD_BY_DECILE[cropGroup] ?? YIELD_BY_DECILE.default
    const targetYield = (station as any).target_yield_t_ha ?? yieldDeciles[2]
    const targetN = targetYield * Math.abs(nPerTonne)
    const cropUptake = (gddPercent / 100) * targetYield * Math.abs(nPerTonne)
    const availableN = Math.max(0, soilN + appliedN - leachingLoss - cropUptake)
    const nGap = Math.max(0, targetN - availableN)

    const status = availableN < targetN * 0.6 ? 'DEFICIENT'
      : availableN < targetN * 0.85 ? 'MARGINAL'
      : 'SUFFICIENT'

    return {
      station_id: station.id,
      paddock_name: station.paddock_name || station.id,
      crop_name: station.crop_type?.crop_name,
      soil_type: station.soil_type ?? 'loam',
      hectares: station.hectares,
      target_yield: targetYield,
      target_n: Math.round(targetN),
      available_n: Math.round(availableN * 10) / 10,
      n_gap: Math.round(nGap),
      status,
    }
  }))

  return NextResponse.json(results)
}
