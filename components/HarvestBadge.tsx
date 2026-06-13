interface HarvestBadgeProps {
  harvest: any
  size?: 'sm' | 'md'
}

export default function HarvestBadge({ harvest, size = 'md' }: HarvestBadgeProps) {
  if (!harvest) return null

  const status = harvest.status?.toUpperCase()

  // Don't show badge at all if crop isn't near harvest yet
  if (status === 'NOT READY' || !status) return null

  let cls = ''
  let label = ''
  let dot = ''

  if (status === 'SUITABLE') {
    cls = 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
    label = 'HARVEST OK'
    dot = 'bg-emerald-400'
  } else if (status === 'CAUTION') {
    cls = 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
    label = 'HARVEST CAUTION'
    dot = 'bg-amber-400'
  } else {
    cls = 'bg-red-900/60 text-red-300 border border-red-700/50'
    label = 'HARVEST NOT SUITABLE'
    dot = 'bg-red-400'
  }

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono font-bold ${textSize} ${cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        🚜 {label}
      </span>
      {harvest.reason && status !== 'SUITABLE' && (
        <div className="text-[10px] text-stone-500 italic pl-1">{harvest.reason}</div>
      )}
    </div>
  )
}
