'use client'

import { useEffect, useRef } from 'react'

interface NitrogenGaugeProps {
  availableN: number
  targetN: number
  status: 'SUFFICIENT' | 'MARGINAL' | 'DEFICIENT'
  paddockName: string
  cropName?: string
  nGap?: number
  selected?: boolean
  onClick?: () => void
}

export default function NitrogenGauge({
  availableN, targetN, status, paddockName, cropName, nGap, selected, onClick
}: NitrogenGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pct = targetN > 0 ? Math.min(1.0, availableN / targetN) : 0

  const statusColor = status === 'SUFFICIENT' ? '#4ade80'
    : status === 'MARGINAL' ? '#fbbf24'
    : '#f87171'
  const statusBg = status === 'SUFFICIENT' ? '#14532d'
    : status === 'MARGINAL' ? '#78350f'
    : '#7f1d1d'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H - 8
    const r = H - 20
    const sw = 16

    ctx.clearRect(0, 0, W, H)

    const pctToRad = (p: number) => Math.PI - p * Math.PI

    // Track
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, 0, false)
    ctx.strokeStyle = '#1a2a10'
    ctx.lineWidth = sw
    ctx.lineCap = 'butt'
    ctx.stroke()

    // Red zone 0-60%
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, pctToRad(0.6), false)
    ctx.strokeStyle = '#7f1d1d'
    ctx.lineWidth = sw
    ctx.lineCap = 'butt'
    ctx.stroke()

    // Amber zone 60-85%
    ctx.beginPath()
    ctx.arc(cx, cy, r, pctToRad(0.6), pctToRad(0.85), false)
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = sw
    ctx.lineCap = 'butt'
    ctx.stroke()

    // Green zone 85-100%
    ctx.beginPath()
    ctx.arc(cx, cy, r, pctToRad(0.85), 0, false)
    ctx.strokeStyle = '#14532d'
    ctx.lineWidth = sw
    ctx.lineCap = 'butt'
    ctx.stroke()

    // Progress highlight
    const safeAngle = pctToRad(Math.min(pct, 0.98))
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, safeAngle, false)
    ctx.strokeStyle = statusColor
    ctx.lineWidth = sw - 8
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.5
    ctx.stroke()
    ctx.globalAlpha = 1

    // Needle
    const na = safeAngle
    const needleLen = r - sw / 2 - 4
    const nx = cx + needleLen * Math.cos(na)
    const ny = cy - needleLen * Math.sin(na)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(nx, ny)
    ctx.strokeStyle = statusColor
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()

    // Hub
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = statusColor
    ctx.fill()

    // Value
    ctx.fillStyle = statusColor
    ctx.font = `bold 20px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(String(availableN), cx, cy - 28)

    ctx.fillStyle = '#78716c'
    ctx.font = '9px sans-serif'
    ctx.fillText('kg N/ha', cx, cy - 13)
  }, [pct, availableN, statusColor])

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-field-500 bg-field-900/30'
          : 'border-[#344a20] bg-[#1e2812] hover:border-field-600 hover:bg-[#222e16]'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={110}
        className="w-full"
        style={{ display: 'block' }}
      />

      <div className="mt-2 text-center space-y-1">
        <div
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md inline-block"
          style={{ color: statusColor, background: statusBg }}
        >
          {status}
        </div>
        <div className="text-xs font-medium text-stone-300 truncate">{paddockName}</div>
        {cropName && <div className="text-[10px] text-stone-500">{cropName}</div>}
        {nGap && nGap > 0
          ? <div className="text-[10px] text-red-400 font-medium">Need {nGap} kg N/ha</div>
          : <div className="text-[10px] text-emerald-500">On track ✓</div>
        }
      </div>
    </button>
  )
}
