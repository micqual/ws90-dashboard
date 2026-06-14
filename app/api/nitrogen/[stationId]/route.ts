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

const DECILE_LABELS = ['Very Low (D1)', 'Low (D2-3)', 'Average (D4-7)', 'High (D8-9)', 'Very High (D10)']

export async function GET(request: Request, { params }: { params: { stationId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const farmerId = (session.user as any).id
  const { stationId } = params

  const station = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId },
    include: { crop_type: true },
  })
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const soilTests = await prisma.$queryRaw`
    SELECT * FROM nitrogen_soil_tests WHERE station_id = ${stationId} ORDER BY tested_at DESC
  ` as any[]

  const seasonStart = station.planted_date ? new Date(station.planted_date) : new Date(new Date().getFullYear(), 3, 1)

  const applications = await prisma.$queryRaw`
    SELECT * FROM nitrogen_applications WHERE station_id = ${stationId} AND applied_at >= ${seasonStart} ORDER BY applied_at DESC
  ` as any[]

  let seasonRainMm = 0
  try {
    const rainResult = await prisma.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN rain_diff > 0 THEN rain_diff ELSE 0 END), 0) AS season_rain
      FROM (SELECT rain_mm - LAG(rain_mm) OVER (ORDER BY created_at) AS rain_diff FROM weather_readings WHERE station_id = ${stationId} AND created_at >= ${seasonStart}) diffs
    ` as any[]
    seasonRainMm = Number(rainResult[0]?.season_rain ?? 0)
  } catch (e) {}

  const latestTest = soilTests[0]
  const soilN = latestTest ? Number(latestTest.no3_n_kg_ha) + Number(latestTest.nh4_n_kg_ha ?? 0) : 0
  const appliedN = applications.reduce((sum: number, a: any) => sum + Number(a.n_kg_ha), 0)

  let leachingLoss = 0, leachingRisk = 'LOW'
  if (seasonRainMm > 300) { leachingLoss = soilN * 0.30; leachingRisk = 'HIGH' }
  else if (seasonRainMm > 150) { leachingLoss = soilN * 0.15; leachingRisk = 'MODERATE' }
  else { leachingLoss = soilN * 0.05; leachingRisk = 'LOW' }

  let gddPercent = 0
  try {
    const gddResult = await prisma.$queryRaw`SELECT accumulated_gdd, target_gdd_harvest FROM growing_degree_days WHERE station_id = ${stationId}` as any[]
    if (gddResult[0]?.target_gdd_harvest > 0) {
      gddPercent = Math.min(100, (Number(gddResult[0].accumulated_gdd) / Number(gddResult[0].target_gdd_harvest)) * 100)
    }
  } catch (e) {}

  const cropGroup = Object.keys(N_PER_TONNE).find(k => station.crop_type?.crop_name?.toLowerCase().includes(k)) ?? 'default'
  const nPerTonne = N_PER_TONNE[cropGroup]
  const yieldDeciles = YIELD_BY_DECILE[cropGroup] ?? YIELD_BY_DECILE.default
  const avgYield = yieldDeciles[2]
  const totalNDemand = avgYield * Math.abs(nPerTonne)
  const cropUptake = (gddPercent / 100) * totalNDemand
  const availableN = Math.max(0, soilN + appliedN - leachingLoss - cropUptake)

  const decileData = yieldDeciles.map((yld, i) => {
    const nRequired = yld * Math.abs(nPerTonne)
    const yieldWithCurrentN = nPerTonne < 0 ? yld : Math.min(yld, availableN / Math.abs(nPerTonne))
    return {
      label: DECILE_LABELS[i],
      yield_potential: yld,
      yield_with_current_n: Math.round(yieldWithCurrentN * 10) / 10,
      n_required: Math.round(nRequired),
      n_topup: Math.round(Math.max(0, nRequired - availableN)),
    }
  })

  const nForAvgYield = avgYield * Math.abs(nPerTonne)
  const status = availableN < nForAvgYield * 0.6 ? 'DEFICIENT' : availableN < nForAvgYield * 0.85 ? 'MARGINAL' : 'SUFFICIENT'

  return NextResponse.json({
    station: { id: station.id, paddock_name: station.paddock_name, crop_name: station.crop_type?.crop_name, planted_date: station.planted_date, hectares: station.hectares },
    balance: {
      soil_n: Math.round(soilN * 10) / 10, applied_n: Math.round(appliedN * 10) / 10,
      leaching_loss: Math.round(leachingLoss * 10) / 10, leaching_risk: leachingRisk,
      crop_uptake: Math.round(cropUptake * 10) / 10, available_n: Math.round(availableN * 10) / 10,
      season_rain_mm: Math.round(seasonRainMm * 10) / 10, gdd_percent: Math.round(gddPercent), status,
    },
    decile_chart: decileData,
    soil_tests: soilTests.map((t: any) => ({ ...t, id: Number(t.id) })),
    applications: applications.map((a: any) => ({ ...a, id: Number(a.id) })),
  })
}
