'use client'

import { format, addDays } from 'date-fns'

interface GDDBarProps {
  gdd: any
  cropName?: string
}

export default function GDDBar({ gdd, cropName }: GDDBarProps) {
  if (!gdd) return null

  const accumulated = Number(gdd.accumulated_gdd ?? 0)
  const target = Number(gdd.target_gdd_harvest ?? 0)
  const daysWithData = Number(gdd.days_with_data ?? 0)
  const percent = target > 0 ? Math.min(100, (accumulated / target) * 100) : 0

  const stageName = gdd.stage_name ?? 'Unknown'
  const stageIcon = gdd.stage_icon ?? '🌱'
  const zadoks = gdd.zadoks_code

  // Harvest window calculation — only show if 14+ days of data
  const MIN_DAYS_FOR_ESTIMATE = 14
  const hasEnoughData = daysWithData >= MIN_DAYS_FOR_ESTIMATE
  const daysRemaining = MIN_DAYS_FOR_ESTIMATE - daysWithData

  let harvestEarliest: Date | null = null
  let harvestLatest: Date | null = null

  if (hasEnoughData && target > 0 && accumulated > 0 && gdd.planted_date) {
    const gddPerDay = accumulated / daysWithData
    const gddRemaining = target - accumulated
    const daysToHarvest = gddPerDay > 0 ? gddRemaining / gddPerDay : null

    if (daysToHarvest && daysToHarvest > 0 && daysToHarvest < 500) {
      const today = new Date()
      harvestEarliest = addDays(today, Math.round(daysToHarvest * 0.9))
      harvestLatest = addDays(today, Math.round(daysToHarvest * 1.15))
    }
  }

  const barColor = percent >= 85
    ? 'bg-amber-500'
    : percent >= 50
    ? 'bg-field-500'
    : 'bg-field-600'

  return (
    <div className="space-y-2">
      {/* Stage badge and GDD values */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 uppercase tracking-wider font-medium">GDD</span>
          <span className="inline-flex items-center gap-1.5 bg-field-900/60 border border-field-700/50 text-field-300 text-xs font-medium px-2 py-0.5 rounded-md">
            <span>{stageIcon}</span>
            <span>{stageName}</span>
            {zadoks && <span className="text-field-500 font-mono text-[10px]">{zadoks}</span>}
          </span>
        </div>
        <span className="text-xs font-mono text-field-300">
          <span className="text-field-200 font-bold">{Math.round(accumulated)}</span>
          <span className="text-stone-500"> / {Math.round(target)} °Cd</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-[#1e2812] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Percent and remaining */}
      <div className="flex items-center justify-between text-[10px] text-stone-600">
        <span>{percent.toFixed(0)}% to harvest</span>
        <span>{Math.round(target - accumulated)} °Cd remaining</span>
      </div>

      {/* Harvest window or building data message */}
      {hasEnoughData && harvestEarliest && harvestLatest ? (
        <div className="flex items-center gap-2 bg-[#1e2812] border border-[#344a20] rounded-lg px-3 py-2 text-xs text-stone-400">
          <span>📅</span>
          <span>Est. harvest window:</span>
          <span className="text-field-300 font-medium">
            {format(harvestEarliest, 'd MMM')} – {format(harvestLatest, 'd MMM yyyy')}
          </span>
        </div>
      ) : !hasEnoughData && target > 0 ? (
        <div className="flex items-center gap-2 bg-[#1e2812] border border-[#344a20] rounded-lg px-3 py-2 text-xs text-stone-500">
          <span>📊</span>
          <span>Building data — harvest estimate available in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>
        </div>
      ) : null}
    </div>
  )
}
