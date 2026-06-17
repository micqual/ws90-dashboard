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

const MITSCHERLICH_C: Record<string, number> = {
  wheat: 0.022, barley: 0.020, canola: 0.018, oats: 0.020, default: 0.020,
}

const YIELD_BY_DECILE: Record<string, number[]> = {
  wheat:   [0.7, 1.5, 2.8, 4.2, 5.7],
  barley:  [0.8, 1.6, 3.0, 4.5, 6.0],
  canola:  [0.3, 0.7, 1.4, 2.0, 2.8],
  oats:    [0.7, 1.5, 2.8, 4.0, 5.5],
  default: [0.7, 1.5, 2.5, 4.0, 5.5],
}

const LEACH_RATES: Record<string, { high: number; mod: number; low: number }> = {
  sand:         { high: 0.45, mod: 0.25, low: 0.10 },
  'sandy loam': { high: 0.35, mod: 0.20, low: 0.08 },
  loam:         { high: 0.20, mod: 0.12, low: 0.05 },
  'clay loam':  { high: 0.12, mod: 0.08, low: 0.03 },
  clay:         { high: 0.08, mod: 0.05, low: 0.02 },
}

const S_CRITICAL: Record<string, number> = {
  sand: 12, 'sandy loam': 10, loam: 8, 'clay loam': 7, clay: 6,
}

function mitscherlich(N: number, Ymax: number, c: number, b: number = 10) {
  return Ymax * (1 - Math.exp(-c * (N + b)))
}

function sAdjustmentFactor(sValue: number | null, critical: number): number {
  if (sValue === null) return 1.0
  if (sValue >= critical) return 1.0
  const ratio = sValue / critical
  if (ratio >= 0.8) return 0.88
  if (ratio >= 0.6) return 0.75
  return 0.60
}

export async function GET(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const farmerId = (session.user as any).id
  const { stationId } = params

  const station = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId },
    include: { crop_type: true },
  })
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const seasonStart = station.planted_date
    ? new Date(station.planted_date)
    : new Date(new Date().getFullYear(), 3, 1)

  const nTests = await prisma.$queryRaw`
    SELECT * FROM nitrogen_soil_tests WHERE station_id = ${stationId} ORDER BY tested_at DESC
  ` as any[]

  let pTests: any[] = []
  try {
    pTests = await prisma.$queryRaw`
      SELECT * FROM phosphorus_soil_tests WHERE station_id = ${stationId} ORDER BY tested_at DESC
    ` as any[]
  } catch (e) {}

  const applications = await prisma.$queryRaw`
    SELECT * FROM nitrogen_applications WHERE station_id = ${stationId} AND applied_at >= ${seasonStart} ORDER BY applied_at ASC
  ` as any[]

  let notes: any[] = []
  try {
    notes = await prisma.$queryRaw`
      SELECT * FROM agronomist_notes WHERE station_id = ${stationId} ORDER BY created_at DESC
    ` as any[]
  } catch (e) {}

  let seasonRainMm = 0
  try {
    const rain = await prisma.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN rain_diff > 0 THEN rain_diff ELSE 0 END), 0) AS season_rain
      FROM (SELECT rain_mm - LAG(rain_mm) OVER (ORDER BY created_at) AS rain_diff
            FROM weather_readings WHERE station_id = ${stationId} AND created_at >= ${seasonStart}) d
    ` as any[]
    seasonRainMm = Number(rain[0]?.season_rain ?? 0)
  } catch (e) {}

  let gddPercent = 0
  let stageName = ''
  try {
    const gdd = await prisma.$queryRaw`
      SELECT accumulated_gdd, target_gdd_harvest, stage_name FROM growing_degree_days WHERE station_id = ${stationId}
    ` as any[]
    if (gdd[0]) {
      const accumulatedGdd = Number(gdd[0].accumulated_gdd ?? 0)
      const targetGdd = Number(gdd[0].target_gdd_harvest ?? 0)
      stageName = gdd[0].stage_name ?? ''
      if (targetGdd > 0) gddPercent = Math.min(100, (accumulatedGdd / targetGdd) * 100)
    }
  } catch (e) {}

  const cropGroup = Object.keys(N_PER_TONNE).find(k =>
    station.crop_type?.crop_name?.toLowerCase().includes(k)
  ) ?? 'default'
  const nPerTonne = N_PER_TONNE[cropGroup]
  const cCoef = MITSCHERLICH_C[cropGroup] ?? MITSCHERLICH_C.default
  const yieldDeciles = YIELD_BY_DECILE[cropGroup] ?? YIELD_BY_DECILE.default
  const soilType = (station.soil_type ?? 'loam').toLowerCase()
  const leachRate = LEACH_RATES[soilType] ?? LEACH_RATES.loam
  const sCritical = S_CRITICAL[soilType] ?? S_CRITICAL.loam

  const latestNTest = nTests[0]
  const soilN = latestNTest ? Number(latestNTest.no3_n_kg_ha) + Number(latestNTest.nh4_n_kg_ha ?? 0) : 0
  const sulphurValue = latestNTest?.sulphur_mg_kg ? Number(latestNTest.sulphur_mg_kg) : null

  const appliedN = applications.reduce((sum, a) => sum + Number(a.n_kg_ha), 0)

  let leachingLoss = 0, leachingRisk = 'LOW'
  if (seasonRainMm > 300) { leachingLoss = soilN * leachRate.high; leachingRisk = 'HIGH' }
  else if (seasonRainMm > 150) { leachingLoss = soilN * leachRate.mod; leachingRisk = 'MODERATE' }
  else { leachingLoss = soilN * leachRate.low; leachingRisk = 'LOW' }

  const targetYield = station.target_yield_t_ha ?? yieldDeciles[2]
  const cropUptake = (gddPercent / 100) * targetYield * Math.abs(nPerTonne)
  const availableN = Math.max(0, soilN + appliedN - leachingLoss - cropUptake)

  const sFactor = sAdjustmentFactor(sulphurValue, sCritical)
  const YmaxFull = targetYield
  const YmaxSLimited = targetYield * sFactor
  const predictedYieldFull = mitscherlich(availableN, YmaxFull, cCoef)
  const predictedYieldSLimited = Math.min(predictedYieldFull, mitscherlich(availableN, YmaxSLimited, cCoef))
  const yieldGapFromS = Math.max(0, predictedYieldFull - predictedYieldSLimited)

  const targetN = targetYield * Math.abs(nPerTonne)
  const nGap = Math.max(0, targetN - availableN)
  const pctOfTarget = targetN > 0 ? Math.min(1, availableN / targetN) : 0

  const decileChart = yieldDeciles.map(yld => {
    const sLimYmax = yld * sFactor
    const yieldWithN = Math.min(mitscherlich(availableN, yld, cCoef), mitscherlich(availableN, sLimYmax, cCoef))
    const nRequired = yld * Math.abs(nPerTonne)
    return {
      decile_yield: yld,
      yield_with_current_n: Math.round(yieldWithN * 10) / 10,
      n_required: Math.round(nRequired),
      n_topup: Math.round(Math.max(0, nRequired - availableN)),
    }
  })

  let timingStatus = 'optimal'
  if (stageName.toLowerCase().includes('flag') || stageName.toLowerCase().includes('heading')) {
    timingStatus = 'acceptable'
  } else if (stageName.toLowerCase().includes('grain') || stageName.toLowerCase().includes('ripening')) {
    timingStatus = 'not_recommended'
  }

  const isCriticalPeriod = (
    (stageName.toLowerCase().includes('stem') || stageName.toLowerCase().includes('flower') || stageName.toLowerCase().includes('node'))
    && pctOfTarget < 0.85
  )

  const latestPTest = pTests[0]
  const phValue = latestPTest?.ph_cacl2 ? Number(latestPTest.ph_cacl2) : null
  const phAlert = phValue !== null && phValue < 5.5

  return NextResponse.json({
    station: {
      id: station.id,
      paddock_name: station.paddock_name,
      farm_name: station.farm_name,
      farm_address: station.farm_address,
      crop_name: station.crop_type?.crop_name,
      variety: station.crop_type?.variety,
      soil_type: soilType,
      hectares: station.hectares,
      planted_date: station.planted_date,
      target_yield: targetYield,
      stage_name: stageName,
      gdd_percent: Math.round(gddPercent),
    },
    balance: {
      soil_n: Math.round(soilN * 10) / 10,
      applied_n: Math.round(appliedN * 10) / 10,
      leaching_loss: Math.round(leachingLoss * 10) / 10,
      leaching_risk: leachingRisk,
      crop_uptake: Math.round(cropUptake * 10) / 10,
      available_n: Math.round(availableN * 10) / 10,
      season_rain_mm: Math.round(seasonRainMm * 10) / 10,
      target_n: Math.round(targetN),
      n_gap: Math.round(nGap),
      pct_of_target: Math.round(pctOfTarget * 100),
    },
    yield_projection: {
      predicted_full: Math.round(predictedYieldFull * 10) / 10,
      predicted_s_limited: Math.round(predictedYieldSLimited * 10) / 10,
      yield_gap_from_s: Math.round(yieldGapFromS * 10) / 10,
      target_yield: targetYield,
      mitscherlich_c: cCoef,
      ymax_full: YmaxFull,
      ymax_s_limited: Math.round(YmaxSLimited * 10) / 10,
    },
    sulphur: {
      value: sulphurValue,
      critical_threshold: sCritical,
      is_limiting: sulphurValue !== null && sulphurValue < sCritical,
    },
    decile_chart: decileChart,
    soil_tests: nTests.map(t => ({ ...t, id: Number(t.id) })),
    phosphorus_tests: pTests.map(t => ({ ...t, id: Number(t.id) })),
    applications: applications.map(a => ({ ...a, id: Number(a.id) })),
    notes: notes.map(n => ({ ...n, id: Number(n.id) })),
    timing: { status: timingStatus, label: 'Now' },
    critical_period: isCriticalPeriod,
    ph_alert: phAlert,
    ph_value: phValue,
  })
}
