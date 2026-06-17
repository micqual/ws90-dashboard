import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
const S_CRITICAL: Record<string, number> = { sand: 12, 'sandy loam': 10, loam: 8, 'clay loam': 7, clay: 6 }

function mitscherlich(N: number, Ymax: number, c: number, b = 10) {
  return Ymax * (1 - Math.exp(-c * (N + b)))
}
function sFactorFor(sValue: number | null, critical: number) {
  if (sValue === null) return 1.0
  if (sValue >= critical) return 1.0
  const ratio = sValue / critical
  if (ratio >= 0.8) return 0.88
  if (ratio >= 0.6) return 0.75
  return 0.60
}

function curveSvgPath(Ymax: number, c: number, xMax: number, toX: (n: number) => number, toY: (y: number) => number) {
  let d = ''
  for (let N = 0; N <= xMax; N += 2) {
    const y = mitscherlich(N, Ymax, c)
    d += (N === 0 ? 'M' : 'L') + toX(N).toFixed(1) + ',' + toY(y).toFixed(1) + ' '
  }
  return d
}

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

  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } })

  const seasonStart = station.planted_date ? new Date(station.planted_date) : new Date(new Date().getFullYear(), 3, 1)

  const nTests = await prisma.$queryRaw`SELECT * FROM nitrogen_soil_tests WHERE station_id = ${stationId} ORDER BY tested_at DESC` as any[]
  let pTests: any[] = []
  try { pTests = await prisma.$queryRaw`SELECT * FROM phosphorus_soil_tests WHERE station_id = ${stationId} ORDER BY tested_at DESC` as any[] } catch (e) {}
  const applications = await prisma.$queryRaw`SELECT * FROM nitrogen_applications WHERE station_id = ${stationId} AND applied_at >= ${seasonStart} ORDER BY applied_at ASC` as any[]
  let notes: any[] = []
  try { notes = await prisma.$queryRaw`SELECT * FROM agronomist_notes WHERE station_id = ${stationId} ORDER BY created_at DESC` as any[] } catch (e) {}

  let seasonRainMm = 0
  try {
    const rain = await prisma.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN rain_diff > 0 THEN rain_diff ELSE 0 END), 0) AS season_rain
      FROM (SELECT rain_mm - LAG(rain_mm) OVER (ORDER BY created_at) AS rain_diff FROM weather_readings WHERE station_id = ${stationId} AND created_at >= ${seasonStart}) d
    ` as any[]
    seasonRainMm = Number(rain[0]?.season_rain ?? 0)
  } catch (e) {}

  let gddPercent = 0, stageName = ''
  try {
    const gdd = await prisma.$queryRaw`SELECT accumulated_gdd, target_gdd_harvest, stage_name FROM growing_degree_days WHERE station_id = ${stationId}` as any[]
    if (gdd[0]) {
      const acc = Number(gdd[0].accumulated_gdd ?? 0), tgt = Number(gdd[0].target_gdd_harvest ?? 0)
      stageName = gdd[0].stage_name ?? ''
      if (tgt > 0) gddPercent = Math.min(100, (acc / tgt) * 100)
    }
  } catch (e) {}

  const cropGroup = Object.keys(N_PER_TONNE).find(k => station.crop_type?.crop_name?.toLowerCase().includes(k)) ?? 'default'
  const nPerTonne = N_PER_TONNE[cropGroup]
  const cCoef = MITSCHERLICH_C[cropGroup] ?? MITSCHERLICH_C.default
  const yieldDeciles = YIELD_BY_DECILE[cropGroup] ?? YIELD_BY_DECILE.default
  const soilType = (station.soil_type ?? 'loam').toLowerCase()
  const leachRate = LEACH_RATES[soilType] ?? LEACH_RATES.loam
  const sCritical = S_CRITICAL[soilType] ?? S_CRITICAL.loam

  const latestN = nTests[0]
  const soilN = latestN ? Number(latestN.no3_n_kg_ha) + Number(latestN.nh4_n_kg_ha ?? 0) : 0
  const sulphurValue = latestN?.sulphur_mg_kg ? Number(latestN.sulphur_mg_kg) : null
  const appliedN = applications.reduce((s, a) => s + Number(a.n_kg_ha), 0)

  let leachingLoss = 0, leachingRisk = 'LOW'
  if (seasonRainMm > 300) { leachingLoss = soilN * leachRate.high; leachingRisk = 'HIGH' }
  else if (seasonRainMm > 150) { leachingLoss = soilN * leachRate.mod; leachingRisk = 'MODERATE' }
  else { leachingLoss = soilN * leachRate.low; leachingRisk = 'LOW' }

  const targetYield = station.target_yield_t_ha ?? yieldDeciles[2]
  const cropUptake = (gddPercent / 100) * targetYield * Math.abs(nPerTonne)
  const availableN = Math.max(0, soilN + appliedN - leachingLoss - cropUptake)

  const sFactor = sFactorFor(sulphurValue, sCritical)
  const YmaxFull = targetYield
  const YmaxSLim = targetYield * sFactor
  const predFull = mitscherlich(availableN, YmaxFull, cCoef)
  const predSLim = Math.min(predFull, mitscherlich(availableN, YmaxSLim, cCoef))

  const latestP = pTests[0]
  const phValue = latestP?.ph_cacl2 ? Number(latestP.ph_cacl2) : null
  const pColwell = latestP?.p_colwell_mg_kg ? Number(latestP.p_colwell_mg_kg) : null
  const pbi = latestP?.pbi ? Number(latestP.pbi) : null

  const W = 500, H = 220, pad = { l: 40, r: 16, t: 16, b: 28 }
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b
  const xMax = 250
  const toX = (n: number) => pad.l + (n / xMax) * pw
  const toY = (y: number) => pad.t + ph - (y / Math.max(YmaxFull, 1)) * ph
  const fullCurvePath = curveSvgPath(YmaxFull, cCoef, xMax, toX, toY)
  const sLimCurvePath = sFactor < 1 ? curveSvgPath(YmaxSLim, cCoef, xMax, toX, toY) : ''

  const decileChart = yieldDeciles.map((yld, i) => {
    const sLimYmax = yld * sFactor
    const yieldWithN = Math.min(mitscherlich(availableN, yld, cCoef), mitscherlich(availableN, sLimYmax, cCoef))
    const nRequired = yld * Math.abs(nPerTonne)
    return {
      label: ['D1 Very Low', 'D2-3 Low', 'D4-7 Average', 'D8-9 High', 'D10 Very High'][i],
      decile_yield: yld,
      yield_with_n: Math.round(yieldWithN * 10) / 10,
      n_topup: Math.round(Math.max(0, nRequired - availableN)),
    }
  })

  const grainPrice = cropGroup === 'canola' ? 700 : 280
  const hectares = station.hectares ?? 1
  const yieldGapValue = (predFull - predSLim) * grainPrice * hectares

  const today = format(new Date(), 'd MMMM yyyy')

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = YmaxFull * f
    return `<line x1="${pad.l}" y1="${toY(y)}" x2="${pad.l + pw}" y2="${toY(y)}" stroke="#e5e7eb" stroke-width="0.5"/><text x="${pad.l - 4}" y="${toY(y) + 3}" font-size="8" fill="#9ca3af" text-anchor="end" font-family="sans-serif">${y.toFixed(1)}t</text>`
  }).join('')

  const xGridLines = [0, 50, 100, 150, 200, 250].map(x =>
    `<line x1="${toX(x)}" y1="${pad.t}" x2="${toX(x)}" y2="${pad.t + ph}" stroke="#e5e7eb" stroke-width="0.5"/><text x="${toX(x)}" y="${H - 6}" font-size="8" fill="#9ca3af" text-anchor="middle" font-family="sans-serif">${x}</text>`
  ).join('')

  const sLimSvg = sLimCurvePath
    ? `<path d="${sLimCurvePath}" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="5,3"/>`
    : ''

  const sFixedLabel = sFactor < 1
    ? `<circle cx="${toX(availableN)}" cy="${toY(predFull)}" r="4" fill="#1e40af"/><text x="${toX(availableN) + 8}" y="${toY(predFull) - 4}" font-size="9" fill="#1e40af" font-family="sans-serif">${predFull.toFixed(1)}t if S fixed</text>`
    : ''

  const sNoteText = sFactor < 1
    ? `<strong style="color:#d97706">S limitation detected</strong> - Sulphur at ${sulphurValue} mg/kg is capping yield at ${predSLim.toFixed(1)} t/ha. Fixing S could unlock an additional ${(predFull - predSLim).toFixed(1)} t/ha.`
    : 'No sulphur limitation detected.'

  const phWarnHtml = (phValue !== null && phValue < 5.5)
    ? `<div class="warn-box"><strong>pH ${phValue} approaching acid threshold</strong> - consider lime application.</div>`
    : ''

  const decileRows = decileChart.map((row, i) => `
    <tr style="${i === 2 ? 'background:#f0fdf4' : ''}">
      <td>${i === 2 ? '<strong>' + row.label + ' (most likely)</strong>' : row.label}</td>
      <td>${row.decile_yield.toFixed(1)} t/ha</td>
      <td style="font-weight:600;color:#14532d">${row.yield_with_n.toFixed(1)} t/ha</td>
      <td>${row.n_topup > 0 ? `<span class="pill pill-amber">+${row.n_topup} kg N</span>` : `<span class="pill pill-green">Sufficient</span>`}</td>
    </tr>`).join('')

  const appRows = applications.length > 0
    ? applications.map(a => `<tr><td>${format(new Date(a.applied_at), 'd MMM')}</td><td>${a.product}</td><td>${a.rate_kg_ha} kg/ha</td><td style="font-weight:600;color:#1e40af">${Number(a.n_kg_ha).toFixed(1)}</td></tr>`).join('')
    : '<tr><td colspan="4" style="color:#9ca3af;font-style:italic;text-align:center">No applications recorded</td></tr>'

  const appTotalRow = applications.length > 0
    ? `<tr style="background:#f0fdf4"><td colspan="3"><strong>Season total</strong></td><td style="font-weight:700;color:#14532d">${appliedN.toFixed(1)} kg N/ha</td></tr>`
    : ''

  const notesHtml = notes.length > 0
    ? notes.slice(0, 3).map(n => `
      <div class="notes-section">
        <div class="notes-body">${n.note}</div>
        <div style="font-family:sans-serif;font-size:8px;color:#9ca3af">${n.author_name} - ${format(new Date(n.created_at), 'd MMMM yyyy')}</div>
      </div>
    `).join('')
    : '<div style="font-family:sans-serif;font-size:10px;color:#9ca3af;font-style:italic">No notes recorded yet for this paddock.</div>'

  const outlookHtml = sFactor < 1 ? `
  <div class="sec-title">Season outlook</div>
  <div class="three-col">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px">
      <div style="font-family:sans-serif;font-size:10px;font-weight:600;color:#14532d;margin-bottom:4px">If S is fixed</div>
      <div style="font-family:sans-serif;font-size:18px;font-weight:700;color:#14532d">${predFull.toFixed(1)} t/ha</div>
      <div style="font-family:sans-serif;font-size:9px;color:#166534">$${(predFull * grainPrice).toFixed(0)}/ha at $${grainPrice}/t</div>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px">
      <div style="font-family:sans-serif;font-size:10px;font-weight:600;color:#78350f;margin-bottom:4px">Without S fix</div>
      <div style="font-family:sans-serif;font-size:18px;font-weight:700;color:#d97706">${predSLim.toFixed(1)} t/ha</div>
      <div style="font-family:sans-serif;font-size:9px;color:#92400e">$${(predSLim * grainPrice).toFixed(0)}/ha at $${grainPrice}/t</div>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:10px">
      <div style="font-family:sans-serif;font-size:10px;font-weight:600;color:#374151;margin-bottom:4px">Value of acting now</div>
      <div style="font-family:sans-serif;font-size:18px;font-weight:700;color:#1a2310">$${yieldGapValue.toFixed(0)}</div>
      <div style="font-family:sans-serif;font-size:9px;color:#6b7280">Total farm gain potential</div>
    </div>
  </div>` : ''

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, serif; color: #1a1a1a; font-size: 11px; }
  .page { width: 100%; padding: 32px 36px; page-break-after: always; min-height: 700px; position: relative; }
  .page:last-child { page-break-after: avoid; }
  .cover-bar { background: #1a2310; height: 8px; width: calc(100% + 72px); margin: -32px -36px 0; }
  .cover-top { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24px; }
  .brand { font-family: sans-serif; font-weight: 600; font-size: 13px; }
  .report-label { font-family: sans-serif; font-size: 10px; color: #6b7280; text-align: right; }
  .cover-divider { height: 2px; background: #1a2310; margin: 20px 0; }
  .cover-title { font-size: 22px; font-weight: 700; color: #1a2310; margin-bottom: 4px; }
  .cover-sub { font-size: 13px; color: #4b5563; margin-bottom: 20px; }
  .cover-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
  .cover-cell { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
  .cover-cell:nth-child(even) { border-right: none; }
  .cover-key { font-family: sans-serif; font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
  .cover-val { font-family: sans-serif; font-size: 12px; color: #1a2310; font-weight: 500; }
  .cover-footer { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }
  .ph { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 1px solid #e5e7eb; font-family: sans-serif; }
  .ph-title { font-size: 11px; font-weight: 600; color: #1a2310; }
  .ph-left, .ph-right { font-size: 10px; color: #6b7280; }
  .pf { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; margin-top: 14px; border-top: 1px solid #e5e7eb; font-family: sans-serif; font-size: 8px; color: #9ca3af; position: absolute; bottom: 24px; left: 36px; right: 36px; }
  .sec-title { font-family: sans-serif; font-size: 13px; font-weight: 700; color: #1a2310; margin-bottom: 8px; border-left: 3px solid #2d4a1a; padding-left: 8px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .data-table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px; margin-bottom: 12px; }
  .data-table th { background: #1a2310; color: #fff; padding: 6px 9px; text-align: left; font-weight: 500; font-size: 9px; }
  .data-table td { padding: 5px 9px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  .pill { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; font-family: sans-serif; }
  .pill-green { background: #dcfce7; color: #14532d; }
  .pill-amber { background: #fef3c7; color: #78350f; }
  .pill-red { background: #fee2e2; color: #7f1d1d; }
  .warn-box { border-left: 3px solid #d97706; background: #fffbeb; padding: 8px 10px; border-radius: 0 4px 4px 0; margin-bottom: 10px; font-family: sans-serif; font-size: 10px; }
  .eq { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 10px; font-family: monospace; font-size: 10px; margin-bottom: 10px; }
  .notes-section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; margin-bottom: 14px; }
  .notes-body { font-size: 11px; color: #374151; line-height: 1.6; margin-bottom: 8px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .disclaimer { font-family: sans-serif; font-size: 8px; color: #9ca3af; margin-top: 10px; line-height: 1.5; border-top: 1px solid #f3f4f6; padding-top: 8px; }
</style>
</head>
<body>

<div class="page">
  <div class="cover-bar"></div>
  <div class="cover-top">
    <div class="brand">Weather Wrangler</div>
    <div class="report-label">
      <div style="font-weight:600;font-size:11px;color:#1a2310">Agronomy Report</div>
      <div>Generated ${today}</div>
    </div>
  </div>
  <div class="cover-divider"></div>
  <div class="cover-title">${station.paddock_name || station.id}</div>
  <div class="cover-sub">${station.farm_name || ''}${station.farm_address ? ' - ' + station.farm_address : ''}</div>
  <div class="cover-grid">
    <div class="cover-cell"><div class="cover-key">Crop</div><div class="cover-val">${station.crop_type?.crop_name || '-'}${station.crop_type?.variety ? ' - ' + station.crop_type.variety : ''}</div></div>
    <div class="cover-cell"><div class="cover-key">Planted</div><div class="cover-val">${station.planted_date ? format(new Date(station.planted_date), 'd MMMM yyyy') : '-'}</div></div>
    <div class="cover-cell"><div class="cover-key">Paddock area</div><div class="cover-val">${station.hectares ? station.hectares + ' ha' : '-'}</div></div>
    <div class="cover-cell"><div class="cover-key">Target yield</div><div class="cover-val">${targetYield.toFixed(1)} t/ha</div></div>
    <div class="cover-cell"><div class="cover-key">Soil type</div><div class="cover-val" style="text-transform:capitalize">${soilType}</div></div>
    <div class="cover-cell"><div class="cover-key">Growth stage</div><div class="cover-val">${stageName || '-'}</div></div>
    <div class="cover-cell"><div class="cover-key">WS90 location</div><div class="cover-val">${station.latitude && station.longitude ? station.latitude.toFixed(4) + ', ' + station.longitude.toFixed(4) : 'Not set'}</div></div>
    <div class="cover-cell"><div class="cover-key">Station installed</div><div class="cover-val">${station.installation_date ? format(new Date(station.installation_date), 'd MMMM yyyy') : '-'}</div></div>
  </div>
  <div class="cover-footer">
    <div style="font-family:sans-serif">
      <div style="font-size:12px;font-weight:600;color:#1a2310">${farmer?.agronomist_name || farmer?.name || ''}</div>
      <div style="font-size:10px;color:#6b7280">${farmer?.agronomist_company || ''}</div>
      <div style="font-size:10px;color:#4a7a2a;margin-top:2px">${farmer?.agronomist_phone || ''}</div>
    </div>
    <div style="text-align:right;font-family:sans-serif">
      <div style="font-size:9px;color:#6b7280">Available N</div>
      <div style="font-size:14px;font-weight:700;color:#14532d">${availableN.toFixed(1)} kg/ha</div>
    </div>
  </div>
</div>

<div class="page">
  <div class="ph"><div><div class="ph-title">Nitrogen Management and Yield Projection</div><div class="ph-left">${station.paddock_name || station.id}</div></div><div class="ph-right">Page 2</div></div>

  <div class="two-col">
    <div>
      <div class="sec-title">Yield response - Mitscherlich model</div>
      <svg width="${W}" height="${H}" style="background:#f9fafb;border-radius:6px">
        ${gridLines}
        ${xGridLines}
        <path d="${fullCurvePath}" fill="none" stroke="#1e40af" stroke-width="2"/>
        ${sLimSvg}
        <line x1="${toX(availableN)}" y1="${toY(0)}" x2="${toX(availableN)}" y2="${toY(Math.max(predFull, predSLim))}" stroke="#6b7280" stroke-width="0.8" stroke-dasharray="2,3"/>
        <circle cx="${toX(availableN)}" cy="${toY(predSLim)}" r="5" fill="#d97706"/>
        <text x="${toX(availableN) + 8}" y="${toY(predSLim) + 3}" font-size="9" font-weight="bold" fill="#d97706" font-family="sans-serif">${predSLim.toFixed(1)}t now</text>
        ${sFixedLabel}
      </svg>
      <div style="font-family:sans-serif;font-size:8px;color:#6b7280;margin-top:4px">
        ${sNoteText}
      </div>
    </div>

    <div>
      <div class="sec-title">N balance</div>
      <div class="eq">
        <span style="color:#14532d;font-weight:700">${soilN.toFixed(1)}</span> soil +
        <span style="color:#1e40af;font-weight:700">${appliedN.toFixed(1)}</span> applied -
        <span style="color:#dc2626;font-weight:700">${leachingLoss.toFixed(1)}</span> leaching -
        <span style="color:#d97706;font-weight:700">${cropUptake.toFixed(1)}</span> uptake =
        <span style="font-weight:700"> ${availableN.toFixed(1)} kg N/ha</span>
      </div>
      <table class="data-table">
        <tr><td>Season rainfall</td><td style="text-align:right;font-weight:600">${seasonRainMm.toFixed(1)} mm</td></tr>
        <tr><td>Leaching risk</td><td style="text-align:right"><span class="pill ${leachingRisk === 'HIGH' ? 'pill-red' : leachingRisk === 'MODERATE' ? 'pill-amber' : 'pill-green'}">${leachingRisk}</span></td></tr>
        <tr><td>Sulphur (KCl40)</td><td style="text-align:right;font-weight:600">${sulphurValue ?? '-'} mg/kg</td></tr>
        <tr><td>pH (1:5 CaCl2)</td><td style="text-align:right;font-weight:600">${phValue ?? '-'}</td></tr>
        <tr><td>Phosphorus Colwell</td><td style="text-align:right;font-weight:600">${pColwell ?? '-'} mg/kg</td></tr>
        <tr><td>PBI</td><td style="text-align:right;font-weight:600">${pbi ?? '-'}</td></tr>
      </table>
      ${phWarnHtml}
    </div>
  </div>

  <div class="sec-title">Yield potential by rainfall decile</div>
  <table class="data-table">
    <thead><tr><th>Decile</th><th>Potential</th><th>With current N</th><th>N top-up</th></tr></thead>
    <tbody>
      ${decileRows}
    </tbody>
  </table>

  <div class="pf"><div>${station.paddock_name || station.id} - Generated by Weather Wrangler - Data from WS90 weather station</div><div>Page 2</div></div>
</div>

<div class="page">
  <div class="ph"><div><div class="ph-title">Soil Fertility and Application History</div><div class="ph-left">${station.paddock_name || station.id}</div></div><div class="ph-right">Page 3</div></div>

  <div class="two-col">
    <div>
      <div class="sec-title">Soil test results</div>
      ${latestN ? `<div style="font-family:sans-serif;font-size:9px;color:#6b7280;margin-bottom:8px">Sample taken ${format(new Date(latestN.tested_at), 'd MMMM yyyy')} - ${latestN.depth_cm}cm depth</div>` : ''}
      <table class="data-table">
        <thead><tr><th>Parameter</th><th>Result</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Nitrate N (NO3-N)</td><td>${latestN?.no3_n_kg_ha ?? '-'} kg/ha</td><td><span class="pill pill-green">-</span></td></tr>
          <tr><td>Ammonium N (NH4-N)</td><td>${latestN?.nh4_n_kg_ha ?? '-'} kg/ha</td><td><span class="pill pill-green">-</span></td></tr>
          <tr><td>Chloride</td><td>${latestN?.chloride_mg_kg ?? '-'} mg/kg</td><td>-</td></tr>
          <tr><td>Sulphur (KCl40)</td><td>${sulphurValue ?? '-'} mg/kg</td><td>${sFactor < 1 ? '<span class="pill pill-amber">Marginal</span>' : '<span class="pill pill-green">Adequate</span>'}</td></tr>
          <tr><td>pH (1:5 CaCl2)</td><td>${phValue ?? '-'}</td><td>${(phValue !== null && phValue < 5.5) ? '<span class="pill pill-amber">Acid risk</span>' : '<span class="pill pill-green">OK</span>'}</td></tr>
          <tr><td>Phosphorus (Colwell)</td><td>${pColwell ?? '-'} mg/kg</td><td>-</td></tr>
          <tr><td>Phosphorus Buffer Index</td><td>${pbi ?? '-'}</td><td>-</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <div class="sec-title">N application history</div>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Product</th><th>Rate</th><th>N kg/ha</th></tr></thead>
        <tbody>
          ${appRows}
          ${appTotalRow}
        </tbody>
      </table>
    </div>
  </div>

  <div class="pf"><div>${station.paddock_name || station.id} - Generated by Weather Wrangler - Data from WS90 weather station</div><div>Page 3</div></div>
</div>

<div class="page">
  <div class="ph"><div><div class="ph-title">Agronomist Recommendations</div><div class="ph-left">${station.paddock_name || station.id}</div></div><div class="ph-right">Page 4</div></div>

  <div class="sec-title">Agronomist notes</div>
  ${notesHtml}

  ${outlookHtml}

  <div class="disclaimer">
    This report is prepared for advisory purposes only. Yield projections are estimates based on the Mitscherlich-Baule model using current soil test data, applied fertiliser records and WS90 weather station readings. Actual yields will vary depending on seasonal rainfall, pest and disease pressure, and management factors not captured in this model. Fertiliser recommendations should be confirmed with your agronomist before application. Grain prices used are indicative only.
    <br><br>
    Generated by Weather Wrangler - WS90 station ID: ${station.id} - Report generated ${today}
  </div>

  <div class="pf"><div>${station.paddock_name || station.id} - Generated by Weather Wrangler</div><div>Page 4</div></div>
</div>

</body>
</html>`

  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = await import('puppeteer-core')

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
    await browser.close()

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="agronomy-report-${station.paddock_name || station.id}.pdf"`,
      },
    })
  } catch (e: any) {
    console.error('PDF generation error:', e)
    return NextResponse.json({ error: 'PDF generation failed: ' + e.message }, { status: 500 })
  }
}
