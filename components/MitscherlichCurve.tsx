'use client'

import { useEffect, useRef } from 'react'

interface MitscherlichCurveProps {
  availableN: number
  targetYield: number
  cCoef: number
  ymaxFull: number
  ymaxSLimited: number
  predictedFull: number
  predictedSLimited: number
}

export default function MitscherlichCurve({
  availableN, targetYield, cCoef, ymaxFull, ymaxSLimited, predictedFull, predictedSLimited
}: MitscherlichCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
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
    const b = 10
    const Ymax = Math.max(ymaxFull, 1)

    const m = (N: number, ymax: number) => ymax * (1 - Math.exp(-cCoef * (N + b)))
    const xMax = Math.max(250, availableN * 1.5)
    const tx = (N: number) => pad.l + (N / xMax) * pw
    const ty = (y: number) => pad.t + ph - (y / Ymax) * ph

    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = '#2a3c18'
    ctx.lineWidth = 0.5
    const yStep = Ymax / 3
    for (let y = 0; y <= Ymax; y += yStep) {
      ctx.beginPath(); ctx.moveTo(pad.l, ty(y)); ctx.lineTo(pad.l + pw, ty(y)); ctx.stroke()
      ctx.fillStyle = '#78716c'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(y.toFixed(1) + 't', pad.l - 3, ty(y) + 3)
    }
    const xStep = Math.round(xMax / 5 / 10) * 10
    for (let x = 0; x <= xMax; x += xStep) {
      ctx.beginPath(); ctx.moveTo(tx(x), pad.t); ctx.lineTo(tx(x), pad.t + ph); ctx.stroke()
      ctx.fillStyle = '#78716c'; ctx.textAlign = 'center'
      ctx.fillText(String(Math.round(x)), tx(x), H - 6)
    }

    // S ceiling line (if limited)
    if (ymaxSLimited < ymaxFull) {
      ctx.beginPath()
      ctx.moveTo(pad.l, ty(ymaxSLimited))
      ctx.lineTo(pad.l + pw, ty(ymaxSLimited))
      ctx.strokeStyle = '#92400e'
      ctx.lineWidth = 0.5
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#fbbf24'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`S ceiling ${ymaxSLimited.toFixed(1)}t`, pad.l + 2, ty(ymaxSLimited) - 3)
    }

    // Full N curve (adequate S)
    ctx.beginPath()
    for (let N = 0; N <= xMax; N += 2) {
      const y = m(N, ymaxFull)
      N === 0 ? ctx.moveTo(tx(N), ty(y)) : ctx.lineTo(tx(N), ty(y))
    }
    ctx.strokeStyle = '#378ADD'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    // S-limited curve
    if (ymaxSLimited < ymaxFull) {
      ctx.beginPath()
      for (let N = 0; N <= xMax; N += 2) {
        const y = m(N, ymaxSLimited)
        N === 0 ? ctx.moveTo(tx(N), ty(y)) : ctx.lineTo(tx(N), ty(y))
      }
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 3])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Current N marker line
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.moveTo(tx(availableN), ty(0))
    ctx.lineTo(tx(availableN), ty(Math.max(predictedFull, predictedSLimited)))
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 0.8
    ctx.stroke()
    ctx.setLineDash([])

    // Predicted point (S-limited — actual)
    ctx.beginPath()
    ctx.arc(tx(availableN), ty(predictedSLimited), 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${predictedSLimited.toFixed(1)}t now`, tx(availableN) + 8, ty(predictedSLimited) + 3)

    // Full potential point (if S limited differs)
    if (ymaxSLimited < ymaxFull) {
      ctx.beginPath()
      ctx.arc(tx(availableN), ty(predictedFull), 5, 0, Math.PI * 2)
      ctx.fillStyle = '#378ADD'
      ctx.fill()
      ctx.fillStyle = '#60a5fa'
      ctx.fillText(`${predictedFull.toFixed(1)}t if S fixed`, tx(availableN) + 8, ty(predictedFull) - 4)
    }

    // Target marker
    if (targetYield > 0 && targetYield <= Ymax) {
      const targN = -Math.log(1 - targetYield / Ymax) / cCoef - b
      if (targN > 0 && targN <= xMax) {
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(pad.l, ty(targetYield))
        ctx.lineTo(tx(targN), ty(targetYield))
        ctx.strokeStyle = '#a3c47a'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.arc(tx(targN), ty(targetYield), 4, 0, Math.PI * 2)
        ctx.fillStyle = '#a3c47a'
        ctx.fill()
        ctx.fillStyle = '#78716c'
        ctx.textAlign = 'left'
        ctx.fillText(`Target ${targetYield.toFixed(1)}t`, tx(targN) + 6, ty(targetYield) + 3)
      }
    }
  }, [availableN, targetYield, cCoef, ymaxFull, ymaxSLimited, predictedFull, predictedSLimited])

  return (
    <div>
      <canvas ref={canvasRef} className="w-full block" />
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-stone-500">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" />With adequate S</span>
        {ymaxSLimited < ymaxFull && (
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block" style={{ borderTop: '1px dashed' }} />Current S (limited)</span>
        )}
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />You are here</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-field-400 inline-block" />Target</span>
      </div>
    </div>
  )
}
