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
  const pct = targetN > 0 ? Math.min(1, availableN / targetN) : 0

  // Semicircle: starts at 180deg (left), ends at 0deg (right)
  // We map pct 0→1 to angle 180→0 (so needle at left = 0, right = full)
  const W = 160
  const H = 90
  const cx = W / 2
  const cy = H - 10
  const r = 65
  const strokeW = 12

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    }
  }

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = polarToXY(startDeg, radius)
    const e = polarToXY(endDeg, radius)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 0 ${e.x} ${e.y}`
  }

  // Zones: 0-60% = red (180→108deg), 60-85% = amber (108→51deg), 85-100% = green (51→0deg)
  const redEnd = 180 - 0.6 * 180    // 108
  const amberEnd = 180 - 0.85 * 180 // 27... actually:
  // angle = 180 - pct*180
  const pctToAngle = (p: number) => 180 - p * 180

  const redStartAngle = 180
  const redEndAngle = pctToAngle(0.6)      // 108
  const amberEndAngle = pctToAngle(0.85)   // 27
  const greenEndAngle = 0

  // Needle angle
  const needleAngle = pctToAngle(pct)
  const needleLen = r - strokeW / 2 - 4
  const needleTip = polarToXY(needleAngle, needleLen)
  const needleBase1 = polarToXY(needleAngle + 90, 5)
  const needleBase2 = polarToXY(needleAngle - 90, 5)

  const statusColor = status === 'SUFFICIENT' ? '#4ade80' : status === 'MARGINAL' ? '#fbbf24' : '#f87171'
  const statusBg = status === 'SUFFICIENT' ? '#14532d' : status === 'MARGINAL' ? '#78350f' : '#7f1d1d'

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? 'border-field-500 bg-field-900/30'
          : 'border-[#344a20] bg-[#1e2812] hover:border-field-600 hover:bg-[#222e16]'
      }`}
    >
      {/* SVG Gauge */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Background arc */}
        <path
          d={arcPath(180, 0, r)}
          fill="none"
          stroke="#1a2a10"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Red zone */}
        <path
          d={arcPath(redStartAngle, redEndAngle, r)}
          fill="none"
          stroke="#7f1d1d"
          strokeWidth={strokeW}
        />
        {/* Amber zone */}
        <path
          d={arcPath(redEndAngle, amberEndAngle, r)}
          fill="none"
          stroke="#78350f"
          strokeWidth={strokeW}
        />
        {/* Green zone */}
        <path
          d={arcPath(amberEndAngle, greenEndAngle, r)}
          fill="none"
          stroke="#14532d"
          strokeWidth={strokeW}
        />
        {/* Progress arc — shows actual N level */}
        <path
          d={arcPath(180, needleAngle, r)}
          fill="none"
          stroke={statusColor}
          strokeWidth={strokeW - 4}
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={statusColor}
        />
        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={5} fill={statusColor} />
        {/* Available N number */}
        <text x={cx} y={cy - 22} textAnchor="middle" fill={statusColor} fontSize="18" fontWeight="bold" fontFamily="monospace">
          {availableN}
        </text>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#78716c" fontSize="8">
          kg N/ha
        </text>
      </svg>

      {/* Status and paddock info */}
      <div className="mt-1 text-center space-y-1">
        <div
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md inline-block"
          style={{ color: statusColor, background: statusBg }}
        >
          {status}
        </div>
        <div className="text-xs font-medium text-stone-300 truncate">{paddockName}</div>
        {cropName && <div className="text-[10px] text-stone-500">{cropName}</div>}
        {nGap && nGap > 0 ? (
          <div className="text-[10px] text-red-400 font-medium">Need {nGap} kg N/ha</div>
        ) : status === 'SUFFICIENT' ? (
          <div className="text-[10px] text-emerald-500">On track ✓</div>
        ) : null}
      </div>
    </button>
  )
}
