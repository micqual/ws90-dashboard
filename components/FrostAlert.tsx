interface FrostAlertProps {
  frost: any
  stationName?: string
}

export default function FrostAlert({ frost, stationName }: FrostAlertProps) {
  if (!frost) return null

  const risk = frost.frost_risk || frost.risk_level || frost.status
  const minTemp = frost.min_temp_c ?? frost.temperature_c

  if (!risk || risk === 'NONE' || risk === 'LOW' || risk === 'NO RISK') return null

  const isCritical = risk === 'CRITICAL' || risk === 'HIGH'

  return (
    <div className={`flex items-start gap-3 rounded-lg px-3 py-2.5 border text-sm ${
      isCritical
        ? 'bg-red-950/50 border-red-800/60 text-red-300'
        : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
    }`}>
      <span className="text-base mt-0.5">{isCritical ? '❄️' : '🌡️'}</span>
      <div>
        <div className="font-medium">
          {isCritical ? 'Frost Risk — Critical' : 'Frost Alert'}
        </div>
        {minTemp != null && (
          <div className="text-xs opacity-80 mt-0.5">
            Min temp: {Number(minTemp).toFixed(1)}°C · {risk}
            {frost.critical_stage ? ` · ${frost.critical_stage} stage` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
