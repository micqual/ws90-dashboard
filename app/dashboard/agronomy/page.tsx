'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import NitrogenGauge from '@/components/NitrogenGauge'
import MitscherlichCurve from '@/components/MitscherlichCurve'
import NSeasonChart from '@/components/NSeasonChart'

const N_PRODUCTS = [
  { name: 'Urea', n_percent: 46 },
  { name: 'DAP', n_percent: 18 },
  { name: 'MAP', n_percent: 10 },
  { name: 'UAN', n_percent: 32 },
  { name: 'Ammonium Sulfate', n_percent: 21 },
  { name: 'Ammonium Nitrate', n_percent: 34 },
  { name: 'Calcium Ammonium Nitrate', n_percent: 27 },
  { name: 'Anhydrous Ammonia', n_percent: 82 },
  { name: 'Chicken Manure', n_percent: 3.5 },
  { name: 'Other', n_percent: 0 },
]

export default function AgronomyPage() {
  const [overview, setOverview] = useState<any[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showNForm, setShowNForm] = useState(false)
  const [showPForm, setShowPForm] = useState(false)
  const [showAppForm, setShowAppForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [nForm, setNForm] = useState({
    tested_at: format(new Date(), 'yyyy-MM-dd'), depth_cm: '60',
    no3_n_kg_ha: '', nh4_n_kg_ha: '', chloride_mg_kg: '', sulphur_mg_kg: '', notes: '',
  })
  const [pForm, setPForm] = useState({
    tested_at: format(new Date(), 'yyyy-MM-dd'), depth_cm: '60',
    ph_cacl2: '', p_colwell_mg_kg: '', pbi: '', notes: '',
  })
  const [appForm, setAppForm] = useState({
    applied_at: format(new Date(), 'yyyy-MM-dd'), product: 'Urea',
    rate_kg_ha: '', n_kg_ha: '', n_percent: '46', method: 'broadcast', notes: '',
  })
  const [noteForm, setNoteForm] = useState({ author_name: '', note: '', visible_to_farmer: true })

  useEffect(() => {
    fetch('/api/agronomy/overview')
      .then(r => r.json())
      .then(d => {
        setOverview(Array.isArray(d) ? d : [])
        if (d.length > 0) setSelectedStation(d[0].station_id)
      })
      .finally(() => setOverviewLoading(false))
  }, [])

  const loadData = useCallback(async () => {
    if (!selectedStation) return
    setLoading(true)
    try {
      const res = await fetch(`/api/agronomy/${selectedStation}`)
      setData(await res.json())
    } catch (e) { setData(null) }
    finally { setLoading(false) }
  }, [selectedStation])

  useEffect(() => { if (selectedStation) loadData() }, [selectedStation, loadData])

  function handleAppProductChange(product: string) {
    const p = N_PRODUCTS.find(p => p.name === product)
    const nPct = p ? p.n_percent : 0
    const rate = Number(appForm.rate_kg_ha)
    setAppForm(prev => ({ ...prev, product, n_percent: String(nPct), n_kg_ha: rate && nPct ? String(Math.round(rate * nPct / 100 * 10) / 10) : prev.n_kg_ha }))
  }
  function handleAppRateChange(rate: string) {
    const nPct = Number(appForm.n_percent)
    setAppForm(prev => ({ ...prev, rate_kg_ha: rate, n_kg_ha: rate && nPct ? String(Math.round(Number(rate) * nPct / 100 * 10) / 10) : prev.n_kg_ha }))
  }

  async function submitForm(type: string, payload: any, resetFn: () => void, closeFn: () => void) {
    setSaving(true); setMessage(null)
    try {
      const res = await fetch(`/api/agronomy/${selectedStation}/events`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMessage({ type: 'success', text: 'Saved successfully' })
      closeFn(); resetFn(); loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally { setSaving(false) }
  }

  const inputCls = `w-full bg-[#1e2812] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-field-500 transition-colors`
  const labelCls = 'block text-xs text-stone-500 mb-1.5 uppercase tracking-wider'

  const balance = data?.balance
  const yieldProj = data?.yield_projection
  const sulphur = data?.sulphur

  const onTrack = overview.filter(s => s.pct_of_target >= 0.85).length
  const watch = overview.filter(s => s.pct_of_target >= 0.6 && s.pct_of_target < 0.85).length
  const needsTopup = overview.filter(s => s.pct_of_target < 0.6).length

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Agronomy</h1>
        <p className="text-sm text-stone-500 mt-0.5">Yield projection · soil fertility · N season balance</p>
      </div>

      {/* Critical period banner */}
      {data?.critical_period && (
        <div className="rounded-xl border border-red-700/50 bg-red-950/40 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="text-sm font-semibold text-red-300">Critical N period — {data.station.paddock_name}</div>
              <div className="text-xs text-red-400/80 mt-0.5">
                {data.station.crop_name} at {data.station.stage_name} · N status below target · Review topdress now
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-red-900/50 text-red-300 border border-red-700/50 shrink-0">ACT NOW</span>
        </div>
      )}

      {/* Farm overview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-200">Farm Yield Overview</h2>
          <div className="flex gap-3 text-xs">
            {onTrack > 0 && <span className="text-emerald-400">✓ {onTrack} on track</span>}
            {watch > 0 && <span className="text-amber-400">⚠ {watch} watch</span>}
            {needsTopup > 0 && <span className="text-red-400">✕ {needsTopup} top-up needed</span>}
          </div>
        </div>
        {overviewLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-field-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : overview.length === 0 ? (
          <div className="text-center text-stone-500 text-sm py-8">No paddocks found</div>
        ) : (
          <div className={`grid gap-3 ${overview.length === 1 ? 'grid-cols-1 max-w-xs' : overview.length === 2 ? 'grid-cols-2' : overview.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {overview.map(s => (
              <NitrogenGauge
                key={s.station_id}
                pctOfTarget={s.pct_of_target}
                paddockName={s.paddock_name}
                cropName={s.crop_name}
                nGap={s.n_gap}
                selected={selectedStation === s.station_id}
                onClick={() => setSelectedStation(s.station_id)}
              />
            ))}
          </div>
        )}
      </div>

      {loading && <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-field-600 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && data && balance && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-stone-200">{data.station.paddock_name} — {data.station.crop_name}{data.station.variety ? ` · ${data.station.variety}` : ''}</h2>
              <div className="text-xs text-stone-500 mt-0.5 capitalize">
                {data.station.soil_type} · {data.station.hectares ? `${data.station.hectares}ha · ` : ''}Target {data.station.target_yield} t/ha
                {data.station.stage_name && ` · ${data.station.stage_name}`}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setShowNForm(s => !s); setShowPForm(false); setShowAppForm(false); setShowNoteForm(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showNForm ? 'bg-field-800 border-field-600 text-field-200' : 'border-[#344a20] text-stone-400 hover:text-stone-200'}`}>
                + N Test
              </button>
              <button onClick={() => { setShowPForm(s => !s); setShowNForm(false); setShowAppForm(false); setShowNoteForm(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showPForm ? 'bg-field-800 border-field-600 text-field-200' : 'border-[#344a20] text-stone-400 hover:text-stone-200'}`}>
                + P Test
              </button>
              <button onClick={() => { setShowAppForm(s => !s); setShowNForm(false); setShowPForm(false); setShowNoteForm(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showAppForm ? 'bg-field-800 border-field-600 text-field-200' : 'border-[#344a20] text-stone-400 hover:text-stone-200'}`}>
                + Apply N
              </button>
              <button onClick={() => { setShowNoteForm(s => !s); setShowNForm(false); setShowPForm(false); setShowAppForm(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showNoteForm ? 'bg-field-800 border-field-600 text-field-200' : 'border-[#344a20] text-stone-400 hover:text-stone-200'}`}>
                + Note
              </button>
            </div>
          </div>

          {message && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-sm border ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300' : 'bg-red-950/50 border-red-800/50 text-red-300'}`}>
              {message.text}
            </div>
          )}

          {/* N Test Form */}
          {showNForm && (
            <form onSubmit={e => { e.preventDefault(); submitForm('n_test', nForm, () => setNForm({ tested_at: format(new Date(), 'yyyy-MM-dd'), depth_cm: '60', no3_n_kg_ha: '', nh4_n_kg_ha: '', chloride_mg_kg: '', sulphur_mg_kg: '', notes: '' }), () => setShowNForm(false)) }}
              className="mb-4 border border-[#344a20] rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-stone-300">Nitrogen Soil Test</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label className={labelCls}>Test Date</label><input type="date" className={inputCls} required value={nForm.tested_at} onChange={e => setNForm(p => ({ ...p, tested_at: e.target.value }))} /></div>
                <div><label className={labelCls}>Depth (cm)</label><input type="number" className={inputCls} value={nForm.depth_cm} onChange={e => setNForm(p => ({ ...p, depth_cm: e.target.value }))} /></div>
                <div><label className={labelCls}>NO3-N (kg/ha)</label><input type="number" step="0.1" className={inputCls} required value={nForm.no3_n_kg_ha} onChange={e => setNForm(p => ({ ...p, no3_n_kg_ha: e.target.value }))} /></div>
                <div><label className={labelCls}>NH4-N (kg/ha)</label><input type="number" step="0.1" className={inputCls} value={nForm.nh4_n_kg_ha} onChange={e => setNForm(p => ({ ...p, nh4_n_kg_ha: e.target.value }))} /></div>
                <div><label className={labelCls}>Chloride (mg/kg)</label><input type="number" step="0.1" className={inputCls} value={nForm.chloride_mg_kg} onChange={e => setNForm(p => ({ ...p, chloride_mg_kg: e.target.value }))} /></div>
                <div><label className={labelCls}>Sulphur KCl40 (mg/kg)</label><input type="number" step="0.1" className={inputCls} value={nForm.sulphur_mg_kg} onChange={e => setNForm(p => ({ ...p, sulphur_mg_kg: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Notes</label><input type="text" className={inputCls} value={nForm.notes} onChange={e => setNForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowNForm(false)} className="px-4 py-2 rounded-lg text-sm text-stone-400 border border-[#344a20]">Cancel</button>
              </div>
            </form>
          )}

          {/* P Test Form */}
          {showPForm && (
            <form onSubmit={e => { e.preventDefault(); submitForm('p_test', pForm, () => setPForm({ tested_at: format(new Date(), 'yyyy-MM-dd'), depth_cm: '60', ph_cacl2: '', p_colwell_mg_kg: '', pbi: '', notes: '' }), () => setShowPForm(false)) }}
              className="mb-4 border border-[#344a20] rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-stone-300">Phosphorus & pH Soil Test</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label className={labelCls}>Test Date</label><input type="date" className={inputCls} required value={pForm.tested_at} onChange={e => setPForm(p => ({ ...p, tested_at: e.target.value }))} /></div>
                <div><label className={labelCls}>Depth (cm)</label><input type="number" className={inputCls} value={pForm.depth_cm} onChange={e => setPForm(p => ({ ...p, depth_cm: e.target.value }))} /></div>
                <div><label className={labelCls}>pH (1:5 CaCl2)</label><input type="number" step="0.1" className={inputCls} value={pForm.ph_cacl2} onChange={e => setPForm(p => ({ ...p, ph_cacl2: e.target.value }))} /></div>
                <div><label className={labelCls}>P Colwell (mg/kg)</label><input type="number" step="0.1" className={inputCls} value={pForm.p_colwell_mg_kg} onChange={e => setPForm(p => ({ ...p, p_colwell_mg_kg: e.target.value }))} /></div>
                <div><label className={labelCls}>PBI</label><input type="number" step="0.1" className={inputCls} value={pForm.pbi} onChange={e => setPForm(p => ({ ...p, pbi: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Notes</label><input type="text" className={inputCls} value={pForm.notes} onChange={e => setPForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowPForm(false)} className="px-4 py-2 rounded-lg text-sm text-stone-400 border border-[#344a20]">Cancel</button>
              </div>
            </form>
          )}

          {/* Application Form */}
          {showAppForm && (
            <form onSubmit={e => { e.preventDefault(); submitForm('application', appForm, () => setAppForm({ applied_at: format(new Date(), 'yyyy-MM-dd'), product: 'Urea', rate_kg_ha: '', n_kg_ha: '', n_percent: '46', method: 'broadcast', notes: '' }), () => setShowAppForm(false)) }}
              className="mb-4 border border-[#344a20] rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-stone-300">Log Nitrogen Application</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><label className={labelCls}>Date Applied</label><input type="date" className={inputCls} required value={appForm.applied_at} onChange={e => setAppForm(p => ({ ...p, applied_at: e.target.value }))} /></div>
                <div><label className={labelCls}>Product</label><select className={inputCls} value={appForm.product} onChange={e => handleAppProductChange(e.target.value)}>{N_PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name} ({p.n_percent}% N)</option>)}</select></div>
                <div><label className={labelCls}>Method</label><select className={inputCls} value={appForm.method} onChange={e => setAppForm(p => ({ ...p, method: e.target.value }))}><option value="broadcast">Broadcast</option><option value="banded">Banded</option><option value="fertigation">Fertigation</option><option value="foliar">Foliar</option><option value="injection">Injection</option></select></div>
                <div><label className={labelCls}>Rate (kg/ha)</label><input type="number" step="0.5" className={inputCls} required value={appForm.rate_kg_ha} onChange={e => handleAppRateChange(e.target.value)} /></div>
                <div><label className={labelCls}>N%</label><input type="number" step="0.1" className={inputCls} value={appForm.n_percent} onChange={e => { const nPct = Number(e.target.value); const rate = Number(appForm.rate_kg_ha); setAppForm(p => ({ ...p, n_percent: e.target.value, n_kg_ha: rate && nPct ? String(Math.round(rate * nPct / 100 * 10) / 10) : p.n_kg_ha })) }} /></div>
                <div><label className={labelCls}>Actual N (kg N/ha)</label><input type="number" step="0.1" className={inputCls} required value={appForm.n_kg_ha} onChange={e => setAppForm(p => ({ ...p, n_kg_ha: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Notes</label><input type="text" className={inputCls} value={appForm.notes} onChange={e => setAppForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowAppForm(false)} className="px-4 py-2 rounded-lg text-sm text-stone-400 border border-[#344a20]">Cancel</button>
              </div>
            </form>
          )}

          {/* Note Form */}
          {showNoteForm && (
            <form onSubmit={e => { e.preventDefault(); submitForm('note', noteForm, () => setNoteForm({ author_name: '', note: '', visible_to_farmer: true }), () => setShowNoteForm(false)) }}
              className="mb-4 border border-[#344a20] rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-stone-300">Add Agronomist Note</h3>
              <div><label className={labelCls}>Your Name</label><input type="text" className={inputCls} required value={noteForm.author_name} onChange={e => setNoteForm(p => ({ ...p, author_name: e.target.value }))} /></div>
              <div><label className={labelCls}>Note</label><textarea className={inputCls} rows={4} required value={noteForm.note} onChange={e => setNoteForm(p => ({ ...p, note: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-xs text-stone-400">
                <input type="checkbox" checked={noteForm.visible_to_farmer} onChange={e => setNoteForm(p => ({ ...p, visible_to_farmer: e.target.checked }))} />
                Visible to farmer
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm">{saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={() => setShowNoteForm(false)} className="px-4 py-2 rounded-lg text-sm text-stone-400 border border-[#344a20]">Cancel</button>
              </div>
            </form>
          )}

          {/* Two column: curve + balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Yield response — N &amp; S co-limitation</div>
              {yieldProj && (
                <MitscherlichCurve
                  availableN={balance.available_n}
                  targetYield={yieldProj.target_yield}
                  cCoef={yieldProj.mitscherlich_c}
                  ymaxFull={yieldProj.ymax_full}
                  ymaxSLimited={yieldProj.ymax_s_limited}
                  predictedFull={yieldProj.predicted_full}
                  predictedSLimited={yieldProj.predicted_s_limited}
                />
              )}
              {sulphur?.is_limiting && (
                <div className="mt-3 flex items-start gap-2 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 text-xs text-amber-300">
                  <span>⚠️</span>
                  <span>S at {sulphur.value} mg/kg is below the {sulphur.critical_threshold} mg/kg threshold for {data.station.soil_type} — limiting yield ceiling. Fix S before adding more N.</span>
                </div>
              )}
              {data.ph_alert && (
                <div className="mt-2 flex items-start gap-2 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 text-xs text-amber-300">
                  <span>⚠️</span>
                  <span>pH {data.ph_value} approaching acid threshold — consider lime application.</span>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">N balance</div>
              <div className="text-xs text-stone-500 font-mono bg-[#1a2310] rounded-lg px-3 py-2 inline-flex flex-wrap gap-x-2 gap-y-1 mb-3">
                <span className="text-field-300">{balance.soil_n} soil</span><span>+</span>
                <span className="text-blue-400">{balance.applied_n} applied</span><span>−</span>
                <span className="text-red-400">{balance.leaching_loss} leaching</span><span>−</span>
                <span className="text-amber-400">{balance.crop_uptake} uptake</span><span>=</span>
                <span className="text-stone-100 font-bold">{balance.available_n} kg N/ha</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1a2310] rounded-lg p-2.5 border border-[#344a20]"><div className="text-[10px] text-stone-500">Soil NO3-N</div><div className="font-mono text-sm font-bold text-field-300">{data.soil_tests[0]?.no3_n_kg_ha ?? '—'}</div></div>
                <div className="bg-[#1a2310] rounded-lg p-2.5 border border-[#344a20]"><div className="text-[10px] text-stone-500">Sulphur</div><div className="font-mono text-sm font-bold text-amber-400">{sulphur?.value ?? '—'}</div></div>
                <div className="bg-[#1a2310] rounded-lg p-2.5 border border-[#344a20]"><div className="text-[10px] text-stone-500">Season rain</div><div className="font-mono text-sm font-bold text-sky-400">{balance.season_rain_mm}mm</div></div>
                <div className="bg-[#1a2310] rounded-lg p-2.5 border border-[#344a20]"><div className="text-[10px] text-stone-500">pH (CaCl2)</div><div className="font-mono text-sm font-bold text-stone-300">{data.ph_value ?? '—'}</div></div>
                <div className="bg-[#1a2310] rounded-lg p-2.5 border border-[#344a20]"><div className="text-[10px] text-stone-500">P Colwell</div><div className="font-mono text-sm font-bold text-stone-300">{data.phosphorus_tests[0]?.p_colwell_mg_kg ?? '—'}</div></div>
                <div className="bg-[#1a2310] rounded-lg p-2.5 border border-[#344a20]"><div className="text-[10px] text-stone-500">PBI</div><div className="font-mono text-sm font-bold text-stone-300">{data.phosphorus_tests[0]?.pbi ?? '—'}</div></div>
              </div>

              {data.notes?.length > 0 && (
                <div className="mt-3 bg-[#1a2310] border border-[#344a20] rounded-lg p-3">
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1.5">Agronomist Notes</div>
                  {data.notes.slice(0, 2).map((n: any) => (
                    <div key={n.id} className="mb-2 last:mb-0">
                      <div className="text-xs text-stone-300 border-l-2 border-field-600 pl-2">{n.note}</div>
                      <div className="text-[10px] text-stone-600 mt-0.5">{n.author_name} · {format(new Date(n.created_at), 'd MMM yyyy')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* N season chart */}
          <div className="mt-5 pt-5 border-t border-[#344a20]">
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">N Season Balance</div>
            <NSeasonChart
              plantedDate={data.station.planted_date}
              soilTests={data.soil_tests}
              applications={data.applications}
            />
          </div>

          {/* Decile chart table */}
          {data.decile_chart?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-[#344a20]">
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Yield Potential by Rainfall Decile</div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-[#344a20]"><th className="px-2 py-2 text-left text-stone-500 uppercase">Decile</th><th className="px-2 py-2 text-right text-stone-500 uppercase">Potential</th><th className="px-2 py-2 text-right text-stone-500 uppercase">With current N</th><th className="px-2 py-2 text-right text-stone-500 uppercase">Top-up</th></tr></thead>
                <tbody>
                  {['D1 Very Low', 'D2-3 Low', 'D4-7 Average', 'D8-9 High', 'D10 Very High'].map((label, i) => {
                    const row = data.decile_chart[i]
                    if (!row) return null
                    return (
                      <tr key={i} className={`border-b border-[#2a3c18] ${i === 2 ? 'bg-field-900/20' : ''}`}>
                        <td className="px-2 py-2 text-stone-300">{label}{i === 2 && <span className="ml-1 text-[10px] text-field-500">← most likely</span>}</td>
                        <td className="px-2 py-2 text-right font-mono text-stone-400">{row.decile_yield.toFixed(1)} t/ha</td>
                        <td className="px-2 py-2 text-right font-mono text-emerald-400">{row.yield_with_current_n.toFixed(1)} t/ha</td>
                        <td className={`px-2 py-2 text-right font-mono ${row.n_topup > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>{row.n_topup > 0 ? `${row.n_topup} kg N/ha` : '✓'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-xs text-stone-600 pb-2">
        Yield projections use the Mitscherlich-Baule model · Estimates only · Consult your agronomist for fertiliser decisions
      </div>
    </div>
  )
}
