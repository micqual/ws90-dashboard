import { format, addDays } from 'date-fns'

interface GDDBarProps {
  current: number | null | undefined
  target: number | null | undefined
  cropName?: string
  plantedDate?: string | Date | null
  stageName?: string | null
  stageIcon?: string | null
  zadoksCode?: string | null
}

export default function GDDBar({
  current, target, cropName, plantedDate,
  stageName, stageIcon, zadoksCode
}: GDDBarProps) {
  if (!target || target <= 0) {
    return <div className="text-xs text-stone-600 italic">No GDD target set</div>
  }

  const gdd = current ?? 0
  const pct = Math.min(100, Math.round((gdd / target) * 100))

  let barColor = 'bg-field-600'
  let textColor = 'text-field-400'
  if (pct >= 90) {
    barColor = 'bg-emerald-600'
    textColor = 'text-emerald-400'
  } else if (pct >= 60) {
    barColor = 'bg-field-500'
    textColor = 'text-field-300'
  }

  // Harvest window estimate
  let harvestWindow: string | null = null
  if (plantedDate && gdd > 0 && pct < 100) {
    const planted = new Date(plantedDate)
    const today = new Date()
    const daysElapsed = Math.max(1, Math.round((today.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24)))
    const avgGddPerDay = gdd / daysElapsed
    if (avgGddPerDay > 0) {
      const daysRemaining = Math.round((target - gdd) / avgGddPerDay)
      const earliest = addDays(today, Math.round(daysRemaining * 0.9))
      const latest = addDays(today, Math.round(daysRemaining * 1.15))
      harvestWindow = `${format(earliest, 'd MMM')} – ${format(latest, 'd MMM yyyy')}`
    }
  }

  return (
    <div className="space-y-1.5">
      {/* Stage badge + GDD values */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-stone-500">GDD</span>
          {stageName && (
            <span className="inline-flex items-center gap-1 bg-[#0e1108] border border-[#2a3518] rounded px-2 py-0.5 text-[10px] text-stone-300">
              {stageIcon && <span>{stageIcon}</span>}
              <span>{stageName}</span>
              {zadoksCode && (
                <span className="text-stone-600 font-mono ml-0.5">{zadoksCode}</span>
              )}
            </span>
          )}
        </div>
        <span className={`font-mono text-xs font-bold ${textColor}`}>
          {Math.round(gdd).toLocaleString()} / {Math.round(target).toLocaleString()}
          <span className="text-stone-600 font-normal ml-1">°Cd</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#0e1108] rounded-full overflow-hidden border border-[#2a3518]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-stone-600">
          {pct >= 90 ? '🌾 Near harvest' : `${pct}% to harvest`}
        </span>
        <span className="text-[10px] text-stone-600">
          {target - gdd > 0 ? `${Math.round(target - gdd)} °Cd remaining` : 'Target reached'}
        </span>
      </div>

      {/* Harvest window */}
      {harvestWindow && (
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-[#0e1108] border border-[#2a3518] rounded px-2 py-1">
          <svg className="w-3 h-3 text-field-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
          </svg>
          Est. harvest window: <span className="text-field-400 font-medium ml-1">{harvestWindow}</span>
        </div>
      )}
    </div>
  )
}
