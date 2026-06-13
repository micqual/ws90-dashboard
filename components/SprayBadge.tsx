interface SprayBadgeProps {
  status: string | null | undefined
  size?: 'sm' | 'md'
}

export default function SprayBadge({ status, size = 'md' }: SprayBadgeProps) {
  const s = status?.toUpperCase()

  let cls = ''
  let label = 'ALL CLEAR'
  let dot = ''

  if (s === 'SUITABLE') {
    cls = 'badge-suitable'
    label = 'SUITABLE'
    dot = 'bg-emerald-400'
  } else if (s === 'CAUTION') {
    cls = 'badge-caution'
    label = 'CAUTION'
    dot = 'bg-amber-400'
  } else if (s === 'NOT SUITABLE' || s === 'UNSUITABLE') {
    cls = 'badge-unsuitable'
    label = 'NOT SUITABLE'
    dot = 'bg-red-400'
  } else {
    cls = 'bg-field-800/60 text-field-400 border border-field-700/50'
    label = 'ALL CLEAR'
    dot = 'bg-field-500'
  }

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono font-bold ${textSize} ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
