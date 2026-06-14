interface DryingConditionsProps {
  drying: any
}

export default function DryingConditions({ drying }: DryingConditionsProps) {
  if (!drying) return null

  const grainIndex = drying.grain_drying_index
  const fieldStatus = drying.field_surface_status

  const grainColors: Record<string, string> = {
    HIGH:     'bg-emerald-900/50 border-emerald-700/50 text-emerald-300',
    MODERATE: 'bg-amber-900/40 border-amber-700/50 text-amber-300',
    POOR:     'bg-red-900/40 border-red-700/50 text-red-300',
  }

  const fieldColors: Record<string, string> = {
    DRY:  'bg-emerald-900/50 border-emerald-700/50 text-emerald-300',
    DAMP: 'bg-amber-900/40 border-amber-700/50 text-amber-300',
    WET:  'bg-sky-900/40 border-sky-700/50 text-sky-300',
  }

  const grainIcons: Record<string, string> = { HIGH: '🌬️', MODERATE: '💨', POOR: '😶‍🌫️' }
  const fieldIcons: Record<string, string> = { DRY: '🟤', DAMP: '💧', WET: '🌊' }

  const hoursText = drying.hours_since_rain != null
    ? `${Number(drying.hours_since_rain).toFixed(0)}h since last rain`
    : 'No recent rain'

  const evapRate = Number(drying.evap_rate_proxy ?? 0)

  return (
    <div className="space-y-2">
      <div className={`rounded-lg border px-3 py-2.5 ${grainColors[grainIndex] ?? 'bg-stone-800/40 border-stone-700/50 text-stone-400'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>{grainIcons[grainIndex] ?? '💨'}</span>
            <div>
              <div className="text-xs font-semibold">Grain Drying</div>
              {drying.grain_drying_reason && <div className="text-[10px] opacity-75 mt-0.5">{drying.grain_drying_reason}</div>}
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold shrink-0">{grainIndex}</span>
        </div>
      </div>

      <div className={`rounded-lg border px-3 py-2.5 ${fieldColors[fieldStatus] ?? 'bg-stone-800/40 border-stone-700/50 text-stone-400'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>{fieldIcons[fieldStatus] ?? '🟤'}</span>
            <div>
              <div className="text-xs font-semibold">Field Surface</div>
              {drying.field_surface_reason && <div className="text-[10px] opacity-75 mt-0.5">{drying.field_surface_reason}</div>}
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold shrink-0">{fieldStatus}</span>
        </div>
      </div>

      <div className="flex gap-2 text-[10px] text-stone-500">
        <span className="bg-[#1e2812] border border-[#344a20] rounded px-2 py-1">💧 {hoursText}</span>
        {evapRate > 0 && <span className="bg-[#1e2812] border border-[#344a20] rounded px-2 py-1">🌬 Evap ~{evapRate.toFixed(2)} mm/hr</span>}
      </div>
    </div>
  )
}
