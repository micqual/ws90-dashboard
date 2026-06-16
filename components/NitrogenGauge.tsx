'use client'

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
  const pct = targetN > 0 ? Math.min(1.0, availableN / targetN) : 0

  const W = 180
  const H = 100
  const cx = W / 2
  const cy = H - 8
  const r = 70
  const strokeW = 14

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) }
  }

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = polarToXY(startDeg, radius)
    const e = polarToXY(endDeg, radius)
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 0 ${e.x} ${e.y}`
  }

  // angle: 180 = left (0%), 0 = right (100%)
  const pctToAngle = (p: number) => 180 - p * 180
  const needleAngle = pctToAngle(pct)

  // Zone boundaries
  const redEndAngle   = pctToAngle(0.60)  // 108°
  const amberEndAngle = pctToAngle(0.85)  // 27°

  // Needle
  const needleR = r - strokeW - 2
  const tip = polarToXY(needleAngle, needleR)
  const b1  = polarToXY(needleAngle + 90, 4)
  const b2  = polarToXY(needleAngle - 90, 4)

  const statusColor = status === 'SUFFICIENT' ? '#4ade80' : status === 'MARGINAL' ? '#fbbf24' : '#f87171'
  const statusBg    = status === 'SUFFICIENT' ? '#14532d' : status === 'MARGINAL' ? '#78350f' : '#7f1d1d'

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-field-500 bg-field-900/30'
          : 'border-[#344a20] bg-[#1e2812] hover:border-field-600 hover:bg-[#222e16]'
      }`}
    >
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Track */}
        <path d={arcPath(180, 0, r)} fill="none" stroke="#1a2a10" strokeWidth={strokeW} strokeLinecap="butt" />
        {/* Red zone 0-60% */}
        <path d={arcPath(180, redEndAngle, r)} fill="none" stroke="#7f1d1d" strokeWidth={strokeW} />
        {/* Amber zone 60-85% */}
        <path d={arcPath(redEndAngle, amberEndAngle, r)} fill="none" stroke="#92400e" strokeWidth={strokeW} />
        {/* Green zone 85-100% */}
        <path d={arcPath(amberEndAngle, 0, r)} fill="none" stroke="#14532d" strokeWidth={strokeW} />
        {/* Progress highlight */}
        <path d={arcPath(180, needleAngle, r)} fill="none" stroke={statusColor} strokeWidth={strokeW - 6} strokeLinecap="round" opacity="0.5" />
        {/* Needle */}
        <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill={statusColor} />
        {/* Hub */}
        <circle cx={cx} cy={cy} r={5} fill={statusColor} />
        {/* Value */}
        <text x={cx} y={cy - 28} textAnchor="middle" fill={statusColor} fontSize="20" fontWeight="bold" fontFamily="monospace">{availableN}</text>
        <text x={cx} y={cy - 12} textAnchor="middle" fill="#78716c" fontSize="8">kg N/ha</text>
        {/* Zone labels */}
        <text x={14} y={cy + 2} fill="#7f1d1d" fontSize="7" textAnchor="middle">0%</text>
        <text x={W - 14} y={cy + 2} fill="#14532d" fontSize="7" textAnchor="middle">100%</text>
      </svg>

      <div className="mt-1 text-center space-y-1">
        <div className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md inline-block" style={{ color: statusColor, background: statusBg }}>
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
