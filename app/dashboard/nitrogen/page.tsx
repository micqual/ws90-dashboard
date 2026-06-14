'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'

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

export default function NitrogenPage() {
  const [stations, setStations] = useState<any[]>([])
  const [selectedStation, setSelectedStation] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [stationsLoading, setStationsLoading] = useState(true)
  const [showSoilForm, setShowSoilForm] = useState(false)
  const [showAppForm, setShowAppForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [soilForm, setSoilForm] = useState({
    tested_at: format(new Date(), 'yyyy-MM-dd'),
    depth_cm: '60',
    no3_n_kg_ha: '',
    nh4_n_kg_ha: '',
    notes: '',
  })

  const [appForm, setAppForm] = useState({
    applied_at: format(new Date(), 'yyyy-MM-dd'),
    product: 'Urea',
    rate_kg_ha: '',
    n_kg_ha: '',
    n_percent: '46',
    method: 'broadcast',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        const s = d.stations ?? []
        setStations(s)
        if (s.length > 0) setSelectedStation(s[0].id)
      })
      .finally(() => setStationsLoading(false))
  }, [])

  const loadData = useCallback(async () => {
    if (!selectedStation) return
    setLoading(true)
    try {
      const res = await fetch(`/api/nitrogen/${selectedStation}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [selectedStation])

  useEffect(() => {
    if (selectedStation) loadData()
  }, [selectedStation, loadData])

  function handleProductChange(product: string) {
    const p = N_PRODUCTS.find(p => p.name === product)
    const nPct = p ? p.n_percent : 0
    const rate = Number(appForm.rate_kg_ha)
    setAppForm(prev => ({
      ...prev, product, n_percent: String(nPct),
      n_kg_ha: rate && nPct ? String(Math.round(rate * nPct / 100 * 10) / 10) : prev.n_kg_ha,
    }))
  }

  function handleRateChange(rate: string) {
    const nPct = Number(appForm.n_percent)
    setAppForm(prev => ({
      ...prev, rate_kg_ha: rate,
      n_kg_ha: rate && nPct ? String(Math.round(Number(rate) * nPct / 100 * 10) / 10) : prev.n_kg_ha,
    }))
  }

  async function submitSoilTest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/nitrogen/${selectedStation}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'soil_test', ...soilForm }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMessage({ type: 'success', text: 'Soil test logged' })
      setShowSoilForm(false)
      setSoilForm({ tested_at: format(new Date(), 'yyyy-MM-dd'), depth_cm: '60', no3_n_kg_ha: '', nh4_n_kg_ha: '', notes: '' })
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/nitrogen/${selectedStation}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'application', ...appForm }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setMessage({ type: 'success', text: 'N application logged' })
      setShowAppForm(false)
      setAppForm({ applied_at: format(new Date(), 'yyyy-MM-dd'), product: 'Urea', rate_kg_ha: '', n_kg_ha: '', n_percent: '46', method: 'broadcast', notes: '' })
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full bg-[#1e2812] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-field-500 transition-colors`
  const labelCls = 'block text-xs text-stone-500 mb-1.5 uppercase tracking-wider'
  const balance = data?.balance
  const statusColor = balance?.status === 'SUFFICIENT'
    ? 'text-emerald-400 border-emerald-700/50 bg-emerald-900/30'
    : balance?.status === 'MARGINAL'
    ? 'text-amber-400 border-amber-700/50 bg-amber-900/30'
    : 'text-red-400 border-red-700/50 bg-red-900/30'

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Nitrogen Management</h1>
        <p className="text-sm text-stone-500 mt-0.5">N balance, yield potential and application history</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className={labelCls}>Paddock</label>
            <select className={inputCls} value={selectedStation} onChange={e => setSelectedStation(e.target.value)} disabled={stationsLoading}>
              {stationsLoading && <option>Loading…</option>}
              {stations.map((s: any) => (
                <option key={s.id} value={s.id}>{s.paddock_name || s.id}{s.crop_type ? ` · ${s.crop_type.crop_name}` : ''}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowSoilForm(s => !s)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showSoilForm ? 'bg-field-800 border-field-600 text-field-200' : 'border-[#344a20] text-stone-400 hover:text-stone-200'}`}>
            + Soil Test
          </button>
          <button onClick={() => setShowAppForm(s => !s)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showAppForm ? 'bg-field-800 border-field-600 text-field-200' : 'border-[#344a20] text-stone-400 hover:text-stone-200'}`}>
            + Apply N
          </button>
        </div>

        {message && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-sm border ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300' : 'bg-red-950/50 border-red-800/50 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {showSoilForm && (
          <form onSubmit={submitSoilTest} className="mt-4 border-t border-[#344a20] pt-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-300">Log Soil Nitrogen Test</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className={labelCls}>Test Date</label><input type="date" className={inputCls} required value={soilForm.tested_at} onChange={e => setSoilForm(p => ({ ...p, tested_at: e.target.value }))} /></div>
              <div><label className={labelCls}>Depth (cm)</label><input type="number" className={inputCls} placeholder="60" value={soilForm.depth_cm} onChange={e => setSoilForm(p => ({ ...p, depth_cm: e.target.value }))} /></div>
              <div><label className={labelCls}>NO3-N (kg/ha)</label><input type="number" step="0.1" className={inputCls} placeholder="45" required value={soilForm.no3_n_kg_ha} onChange={e => setSoilForm(p => ({ ...p, no3_n_kg_ha: e.target.value }))} /></div>
              <div><label className={labelCls}>NH4-N (kg/ha)</label><input type="number" step="0.1" className={inputCls} placeholder="optional" value={soilForm.nh4_n_kg_ha} onChange={e => setSoilForm(p => ({ ...p, nh4_n_kg_ha: e.target.value }))} /></div>
            </div>
            <div><label className={labelCls}>Notes</label><input type="text" className={inputCls} placeholder="Lab name, sample details..." value={soilForm.notes} onChange={e => setSoilForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-lg text-sm">{saving ? 'Saving…' : 'Save Soil Test'}</button>
              <button type="button" onClick={() => setShowSoilForm(false)} className="px-4 py-2 rounded-lg text-sm text-stone-400 border border-[#344a20]">Cancel</button>
            </div>
          </form>
        )}

        {showAppForm && (
          <form onSubmit={submitApplication} className="mt-4 border-t border-[#344a20] pt-4 space-y-3">
            <h3 className="text-sm font-medium text-stone-300">Log Nitrogen Application</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Date Applied</label><input type="date" className={inputCls} required value={appForm.applied_at} onChange={e => setAppForm(p => ({ ...p, applied_at: e.target.value }))} /></div>
              <div>
                <label className={labelCls}>Product</label>
                <select className={inputCls} value={appForm.product} onChange={e => handleProductChange(e.target.value)}>
                  {N_PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name} ({p.n_percent}% N)</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Method</label>
                <select className={inputCls} value={appForm.method} onChange={e => setAppForm(p => ({ ...p, method: e.target.value }))}>
                  <option value="broadcast">Broadcast</option>
                  <option value="banded">Banded</option>
                  <option value="fertigation">Fertigation</option>
                  <option value="foliar">Foliar</option>
                  <option value="injection">Injection</option>
                </select>
              </div>
              <div><label className={labelCls}>Rate (kg product/ha)</label><input type="number" step="0.5" className={inputCls} placeholder="100" required value={appForm.rate_kg_ha} onChange={e => handleRateChange(e.target.value)} /></div>
              <div><label className={labelCls}>N% (if Other)</label><input type="number" step="0.1" className={inputCls} value={appForm.n_percent} onChange={e => { const nPct = Number(e.target.value); const rate = Number(appForm.rate_kg_ha); setAppForm(p => ({ ...p, n_percent: e.target.value, n_kg_ha: rate && nPct ? String(Math.round(rate * nPct / 100 * 10) / 10) : p.n_kg_ha })) }} /></div>
              <div><label className={labelCls}>Actual N (kg N/ha)</label><input type="number" step="0.1" className={inputCls} placeholder="Auto-calculated" required value={appForm.n_kg_ha} onChange={e => setAppForm(p => ({ ...p, n_kg_ha: e.target.value }))} /></div>
            </div>
            <div><label className={labelCls}>Notes</label><input type="text" className={inputCls} placeholder="Paddock conditions..." value={appForm.notes} onChange={e => setAppForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-lg text-sm">{saving ? 'Saving…' : 'Save Application'}</button>
              <button type="button" onClick={() => setShowAppForm(false)} className="px-4 py-2 rounded-lg text-sm text-stone-400 border border-[#344a20]">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {loading && <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-field-600 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && data && (
        <>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-200">N Balance — {data.station.paddock_name || data.station.id}</h2>
              {balance && <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${statusColor}`}>{balance.status}</span>}
            </div>
            {balance && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#1e2812] rounded-lg p-3 border border-[#344a20]"><div className="text-xs text-stone-500 mb-1">Soil N (last test)</div><div className="font-mono text-lg font-bold text-field-300">{balance.soil_n} <span className="text-xs text-stone-500 font-normal">kg/ha</span></div></div>
                  <div className="bg-[#1e2812] rounded-lg p-3 border border-[#344a20]"><div className="text-xs text-stone-500 mb-1">Applied this season</div><div className="font-mono text-lg font-bold text-blue-400">{balance.applied_n} <span className="text-xs text-stone-500 font-normal">kg N/ha</span></div></div>
                  <div className="bg-[#1e2812] rounded-lg p-3 border border-[#344a20]"><div className="text-xs text-stone-500 mb-1">Season rainfall</div><div className="font-mono text-lg font-bold text-sky-400">{balance.season_rain_mm} <span className="text-xs text-stone-500 font-normal">mm</span></div></div>
                  <div className="bg-[#1e2812] rounded-lg p-3 border border-[#344a20]"><div className="text-xs text-stone-500 mb-1">Leaching loss ({balance.leaching_risk})</div><div className="font-mono text-lg font-bold text-red-400">-{balance.leaching_loss} <span className="text-xs text-stone-500 font-normal">kg/ha</span></div></div>
                  <div className="bg-[#1e2812] rounded-lg p-3 border border-[#344a20]"><div className="text-xs text-stone-500 mb-1">Crop uptake ({balance.gdd_percent}% GDD)</div><div className="font-mono text-lg font-bold text-amber-400">-{balance.crop_uptake} <span className="text-xs text-stone-500 font-normal">kg/ha</span></div></div>
                  <div className={`rounded-lg p-3 border ${statusColor}`}><div className="text-xs mb-1 opacity-75">Available N</div><div className="font-mono text-lg font-bold">{balance.available_n} <span className="text-xs font-normal opacity-75">kg N/ha</span></div></div>
                </div>
                <div className="text-xs text-stone-600">N balance = Soil N + Applied N − Leaching Loss − Crop Uptake · Leaching estimated from season rainfall · Uptake estimated from GDD progress</div>
              </>
            )}
            {!balance?.soil_n && <div className="text-sm text-stone-500 italic">No soil test recorded yet — add a soil test to see your N balance.</div>}
          </div>

          {data.decile_chart && (
            <div className="card p-5">
              <h2 className="font-semibold text-stone-200 mb-1">Yield Potential by Rainfall Decile</h2>
              <p className="text-xs text-stone-500 mb-4">t/ha — dark = unlimited N · light = current N supply</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.decile_chart} margin={{ top: 4, right: 8, bottom: 0, left: -10 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3c18" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} unit=" t" />
                  <Tooltip contentStyle={{ background: '#222e16', border: '1px solid #344a20', borderRadius: '8px', fontSize: '11px', color: '#e7e5e4' }} formatter={(val: any, name: any) => [`${Number(val).toFixed(1)} t/ha`, name === 'yield_potential' ? 'Unlimited N' : 'Current N']} />
                  <Legend formatter={(v: any) => v === 'yield_potential' ? 'Unlimited N' : 'Current N'} wrapperStyle={{ fontSize: '11px', color: '#78716c' }} />
                  <Bar dataKey="yield_potential" fill="#166534" radius={[3, 3, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="yield_with_current_n" fill="#4ade80" radius={[3, 3, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[#344a20]">{['Rainfall', 'Yield potential', 'With current N', 'N top-up needed'].map(h => <th key={h} className="px-3 py-2 text-left text-stone-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {data.decile_chart.map((row: any, i: number) => (
                      <tr key={i} className={`border-b border-[#2a3c18] ${i % 2 === 0 ? '' : 'bg-[#1e2812]/40'}`}>
                        <td className="px-3 py-2 text-stone-300">{row.label}</td>
                        <td className="px-3 py-2 text-right font-mono text-stone-400">{row.yield_potential.toFixed(1)} t/ha</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{row.yield_with_current_n.toFixed(1)} t/ha</td>
                        <td className={`px-3 py-2 text-right font-mono ${row.n_topup > 0 ? 'text-amber-400' : 'text-stone-500'}`}>{row.n_topup > 0 ? `${row.n_topup} kg N/ha` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.soil_tests?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="card-header"><h2 className="font-semibold text-stone-200">Soil Test History</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#344a20]">{['Date', 'Depth', 'NO3-N', 'NH4-N', 'Total N', 'Notes'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs text-stone-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {data.soil_tests.map((t: any, i: number) => (
                      <tr key={t.id} className={`border-b border-[#2a3c18] ${i % 2 === 0 ? '' : 'bg-[#1e2812]/40'}`}>
                        <td className="px-4 py-2.5 text-stone-300 font-medium">{format(new Date(t.tested_at), 'd MMM yyyy')}</td>
                        <td className="px-4 py-2.5 font-mono text-stone-400">{t.depth_cm}cm</td>
                        <td className="px-4 py-2.5 font-mono text-field-300">{Number(t.no3_n_kg_ha).toFixed(1)}</td>
                        <td className="px-4 py-2.5 font-mono text-field-300">{Number(t.nh4_n_kg_ha).toFixed(1)}</td>
                        <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{(Number(t.no3_n_kg_ha) + Number(t.nh4_n_kg_ha)).toFixed(1)} kg/ha</td>
                        <td className="px-4 py-2.5 text-stone-500 text-xs">{t.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.applications?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="card-header"><h2 className="font-semibold text-stone-200">Application History — This Season</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[#344a20]">{['Date', 'Product', 'Rate kg/ha', 'N kg/ha', 'Method', 'Notes'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs text-stone-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>
                    {data.applications.map((a: any, i: number) => (
                      <tr key={a.id} className={`border-b border-[#2a3c18] ${i % 2 === 0 ? '' : 'bg-[#1e2812]/40'}`}>
                        <td className="px-4 py-2.5 text-stone-300 font-medium">{format(new Date(a.applied_at), 'd MMM yyyy')}</td>
                        <td className="px-4 py-2.5 text-stone-300">{a.product}</td>
                        <td className="px-4 py-2.5 font-mono text-stone-400">{Number(a.rate_kg_ha).toFixed(0)}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-400 font-bold">{Number(a.n_kg_ha).toFixed(1)}</td>
                        <td className="px-4 py-2.5 text-stone-500 capitalize text-xs">{a.method}</td>
                        <td className="px-4 py-2.5 text-stone-500 text-xs">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!data.soil_tests?.length && !data.applications?.length && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🧪</div>
              <div className="text-stone-400 font-medium mb-2">No nitrogen data yet</div>
              <div className="text-stone-600 text-sm">Add a soil test and N applications using the buttons above.</div>
            </div>
          )}
        </>
      )}

      <div className="text-center text-xs text-stone-600 pb-2">
        N balance is an estimate only · Consult your agronomist for fertiliser decisions
      </div>
    </div>
  )
}
