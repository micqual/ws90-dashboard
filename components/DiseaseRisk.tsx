interface DiseaseRiskProps {
  disease: any
  cropName?: string
}

interface RiskItem {
  label: string
  risk: string | null
  reason: string | null
  icon: string
}

export default function DiseaseRisk({ disease, cropName }: DiseaseRiskProps) {
  if (!disease) return null

  const crop = (cropName ?? disease.crop_name ?? '').toLowerCase()
  const isWheat = crop.includes('wheat')
  const isCanola = crop.includes('canola')
  const isLentil = crop.includes('lentil')

  const items: RiskItem[] = []

  if (isWheat) {
    items.push(
      { label: 'Stripe Rust', risk: disease.stripe_rust_risk, reason: disease.stripe_rust_reason, icon: '🟠' },
      { label: 'Stem Rust',   risk: disease.stem_rust_risk,   reason: disease.stem_rust_reason,   icon: '🔴' },
      { label: 'Leaf Rust',   risk: disease.leaf_rust_risk,   reason: disease.leaf_rust_reason,   icon: '🟡' },
    )
  }

  if (isCanola || isLentil) {
    items.push(
      { label: 'Sclerotinia', risk: disease.sclerotinia_risk, reason: disease.sclerotinia_reason, icon: '🍄' },
    )
  }

  // Only show if at least one is MODERATE or HIGH
  const alerts = items.filter(i => i.risk === 'MODERATE' || i.risk === 'HIGH')
  if (alerts.length === 0) return null

  return (
    <div className="space-y-1.5">
      {alerts.map(item => {
        const isHigh = item.risk === 'HIGH'
        const cls = isHigh
          ? 'bg-red-950/40 border-red-800/50 text-red-300'
          : 'bg-amber-950/40 border-amber-800/50 text-amber-300'

        return (
          <div key={item.label} className={`rounded-lg border px-3 py-2 text-xs ${cls}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium flex items-center gap-1.5">
                <span>{item.icon}</span>
                {item.label}
              </span>
              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isHigh
                  ? 'bg-red-900/60 text-red-300'
                  : 'bg-amber-900/60 text-amber-300'
              }`}>
                {item.risk}
              </span>
            </div>
            {item.reason && (
              <div className="text-[10px] opacity-75 mt-1">{item.reason}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
