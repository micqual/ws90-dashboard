'use client'

import { useEffect, useRef } from 'react'
import { differenceInDays, format } from 'date-fns'

interface NSeasonChartProps {
  plantedDate: string | null
  soilTests: any[]
  applications: any[]
}

export default function NSeasonChart({ plantedDate, soilTests, applications }: NSeasonChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !plantedDate || soilTests.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const dW = canvas.parentElement?.clientWidth ?? 320
    const dH = 200
    canvas.width = dW * dpr
    canvas.height = dH * dpr
    canvas.style.width = dW + 'px'
    canvas.style.height = dH + 'px'
    ctx.scale(dpr, dpr)

    const W = dW, H = dH
    const pad = { l: 38, r: 14, t: 14, b: 26 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b

    const planted = new Date(plantedDate)
    const today = new Date()
    const totalDays = Math.max(1, differenceInDays(today, planted))

    // Build events from real data
    const latestTest = soilTests[soilTests.length - 1] ?? soilTests[0]
    const startN = Number(latestTest?.no3_n_kg_ha ?? 0) + Number(latestTest?.nh4_n_kg_ha ?? 0)
    const testDay = Math.max(0, differenceInDays(new Date(latestTest?.tested_at ?? plantedDate), planted))

    const appEvents = applications.map(a => ({
      day: Math.max(0, differenceInDays(new Date(a.applied_at), planted)),
      dn: Number(a.n_kg_ha),
      type: 'apply' as const,
      product: a.product,
    }))

    const maxN = Math.max(startN + appEvents.reduce((s, e) => s + e.dn, 0), 50) * 1.2

    const tx = (d: number) => pad.l + (d / totalDays) * pw
    const ty = (n: number) => pad.t + ph - (n / maxN) * ph

    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = '#2a3c18'
    ctx.lineWidth = 0.5
    const nStep = Math.round(maxN / 4 / 10) * 10 || 10
    for (let n = 0; n <= maxN; n += nStep) {
      ctx.beginPath(); ctx.moveTo(pad.l, ty(n)); ctx.lineTo(pad.l + pw, ty(n)); ctx.stroke()
      ctx.fillStyle = '#78716c'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(String(n), pad.l - 4, ty(n) + 3)
    }

    // Month labels (approximate)
    const monthStep = Math.max(1, Math.round(totalDays / 4))
    for (let d = 0; d <= totalDays; d += monthStep) {
      const date = new Date(planted)
      date.setDate(date.getDate() + d)
      ctx.fillStyle = '#78716c'; ctx.textAlign = 'center'; ctx.font = '8px sans-serif'
      ctx.fillText(format(date, 'MMM'), tx(d), H - 8)
    }

    // Build N line day by day
    const points: { d: number; n: number }[] = []
    let n = startN
    const uptakePerDay = (startN * 0.3) / totalDays // gentle synthetic uptake
    for (let d = testDay; d <= totalDays; d++) {
      const ev = appEvents.find(e => e.day === d)
      if (ev) n += ev.dn
      n = Math.max(0, n - uptakePerDay)
      points.push({ d, n: Math.round(n * 10) / 10 })
    }

    if (points.length === 0) return

    // Today marker
    ctx.beginPath()
    ctx.moveTo(tx(totalDays), pad.t)
    ctx.lineTo(tx(totalDays), pad.t + ph)
    ctx.strokeStyle = '#4a7a2a'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.stroke()
    ctx.setLineDash([])

    // Fill under line
    ctx.beginPath()
    points.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.d), ty(p.n)) : ctx.lineTo(tx(p.d), ty(p.n)))
    ctx.lineTo(tx(points[points.length - 1].d), ty(0))
    ctx.lineTo(tx(points[0].d), ty(0))
    ctx.closePath()
    ctx.fillStyle = 'rgba(74,222,128,0.07)'
    ctx.fill()

    // N line
    ctx.beginPath()
    points.forEach((p, i) => i === 0 ? ctx.moveTo(tx(p.d), ty(p.n)) : ctx.lineTo(tx(p.d), ty(p.n)))
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Soil test marker
    ctx.beginPath()
    ctx.arc(tx(testDay), ty(startN), 5, 0, Math.PI * 2)
    ctx.fillStyle = '#a3c47a'
    ctx.fill()
    ctx.fillStyle = '#a3c47a'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Soil test ${startN}kg`, tx(testDay) + 7, ty(startN) + 3)

    // Application markers
    appEvents.forEach(e => {
      const pt = points.find(p => p.d === e.day)
      if (!pt) return
      const x = tx(e.day), y = ty(pt.n)
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#1d4ed8'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#60a5fa'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('+' + e.dn + 'kg', x, y - 9)
      ctx.fillText(e.product, x, y - 19)
    })

    // Current N
    const lastPt = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(tx(lastPt.d), ty(lastPt.n), 6, 0, Math.PI * 2)
    ctx.fillStyle = '#4ade80'
    ctx.fill()
    ctx.fillStyle = '#4ade80'
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${lastPt.n}kg/ha`, tx(lastPt.d) + 9, ty(lastPt.n) + 3)

  }, [plantedDate, soilTests, applications])

  if (!plantedDate || soilTests.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-stone-500 italic">
        Add a soil test to see the N season chart
      </div>
    )
  }

  return (
    <div>
      <canvas ref={canvasRef} className="w-full block" />
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-stone-500">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block" />Available N</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Application</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-field-400 inline-block" />Soil test</span>
      </div>
    </div>
  )
}
