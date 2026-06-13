'use client'

import { useEffect, useState } from 'react'

interface Farmer {
  id: string
  name: string
  email: string
  tier: string
  active: boolean
  stations: any[]
}

interface Station {
  id: string
  paddock_name: string
  farmer: { name: string } | null
  crop_type: { crop_name: string; variety?: string } | null
  hectares: number | null
}

interface CropType {
  id: number
  crop_name: string
  variety: string | null
}

export default function AdminPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [activeTab, setActiveTab] = useState<'farmers' | 'stations'>('farmers')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [farmerForm, setFarmerForm] = useState({ name: '', email: '', password: '', tier: 'base' })
  const [stationForm, setStationForm] = useState({
    id: '', farmer_id: '', paddock_name: '', hectares: '',
    crop_type_id: '', planted_date: '', growth_stage: '',
    spray_wind_override: '', frost_temp_override: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/farmers').then(r => r.json()),
      fetch('/api/admin/stations').then(r => r.json()),
      fetch('/api/admin/crop-types').then(r => r.json()),
    ]).then(([f, s, c]) => {
      setFarmers(Array.isArray(f) ? f : [])
      setStations(Array.isArray(s) ? s : [])
      setCropTypes(Array.isArray(c) ? c : [])
    }).finally(() => setLoading(false))
  }, [])

  async function createFarmer(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farmerForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFarmers(prev => [...prev, { ...data, stations: [] }])
      setFarmerForm({ name: '', email: '', password: '', tier: 'base' })
      setMessage({ type: 'success', text: `Farmer "${data.name}" created` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(farmer: Farmer) {
    try {
      const res = await fetch(`/api/admin/farmers/${farmer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !farmer.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...f, active: data.active } : f))
      setMessage({ type: 'success', text: `${data.name} ${data.active ? 'reactivated' : 'deactivated'}` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  async function changeTier(farmer: Farmer, tier: string) {
    try {
      const res = await fetch(`/api/admin/farmers/${farmer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...f, tier: data.tier } : f))
      setMessage({ type: 'success', text: `${data.name} moved to ${tier}` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  async function saveStation(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stationForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStations(prev => {
        const idx = prev.findIndex(s => s.id === data.id)
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
        return [...prev, data]
      })
      setMessage({ type: 'success', text: `Station "${data.id}" saved` })
      setStationForm({ id: '', farmer_id: '', paddock_name: '', hectares: '', crop_type_id: '', planted_date: '', growth_stage: '', spray_wind_override: '', frost_temp_override: '' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm
    placeholder:text-stone-500 focus:outline-none focus:border-field-500 focus:ring-1 focus:ring-field-500/30`
  const labelCls = 'block text-xs text-stone-500 mb-1 uppercase tracking-wider'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-field-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Admin</h1>
        <p className="text-sm text-stone-500 mt-0.5">Manage farmers and station assignments</p>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm border ${
          message.type === 'success'
            ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300'
            : 'bg-red-950/50 border-red-800/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-[#344a20]">
        {(['farmers', 'stations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-field-500 text-field-300'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'farmers' && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-4">Add Farmer</h2>
            <form onSubmit={createFarmer} className="space-y-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input className={inputCls} placeholder="John Smith" required
                  value={farmerForm.name} onChange={e => setFarmerForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} placeholder="john@property.com.au" required
                  value={farmerForm.email} onChange={e => setFarmerForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" className={inputCls} placeholder="Minimum 8 characters" minLength={8} required
                  value={farmerForm.password} onChange={e => setFarmerForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Plan</label>
                <div className="flex gap-2">
                  {(['base', 'pro'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFarmerForm(p => ({ ...p, tier: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        farmerForm.tier === t
                          ? t === 'pro'
                            ? 'bg-amber-900/50 border-amber-700/60 text-amber-300'
                            : 'bg-field-800 border-field-600 text-field-200'
                          : 'bg-[#161e0c] border-[#344a20] text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {t === 'pro' ? '⭐ Pro' : 'Base'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors mt-2">
                {saving ? 'Creating…' : 'Create Farmer'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-4">
              Farmers <span className="text-stone-500 font-normal">({farmers.length})</span>
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {farmers.length === 0 && <div className="text-sm text-stone-500">No farmers yet</div>}
              {farmers.map(f => (
                <div key={f.id} className={`bg-[#161e0c] rounded-lg px-3 py-2.5 border transition-colors ${
                  f.active ? 'border-[#344a20]' : 'border-red-900/30 opacity-60'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-medium ${f.active ? 'text-stone-200' : 'text-stone-500'}`}>
                          {f.name}
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          f.tier === 'pro'
                            ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                            : 'bg-stone-800/60 text-stone-500 border-stone-700/50'
                        }`}>{(f.tier ?? 'base').toUpperCase()}</span>
                        {!f.active && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-red-900/40 text-red-400 border-red-700/50">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">{f.email}</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {f.stations?.length ?? 0} station{f.stations?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {/* Tier toggle */}
                      <button
                        onClick={() => changeTier(f, f.tier === 'pro' ? 'base' : 'pro')}
                        className="text-[10px] px-2 py-1 rounded border border-[#344a20] text-stone-500 hover:text-stone-300 hover:border-[#3d5020] transition-colors"
                      >
                        {f.tier === 'pro' ? '→ Base' : '→ Pro'}
                      </button>
                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(f)}
                        className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                          f.active
                            ? 'border-red-800/50 text-red-400 hover:bg-red-950/40'
                            : 'border-emerald-800/50 text-emerald-400 hover:bg-emerald-950/40'
                        }`}
                      >
                        {f.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stations' && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-4">Add / Update Station</h2>
            <form onSubmit={saveStation} className="space-y-3">
              <div>
                <label className={labelCls}>Station ID (WS90 device ID)</label>
                <input className={inputCls} placeholder="e.g. WS90-001A" required
                  value={stationForm.id} onChange={e => setStationForm(p => ({ ...p, id: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Assign to Farmer</label>
                <select className={inputCls} required
                  value={stationForm.farmer_id} onChange={e => setStationForm(p => ({ ...p, farmer_id: e.target.value }))}>
                  <option value="">Select farmer…</option>
                  {farmers.filter(f => f.active).map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Paddock Name</label>
                <input className={inputCls} placeholder="North Block"
                  value={stationForm.paddock_name} onChange={e => setStationForm(p => ({ ...p, paddock_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Hectares</label>
                  <input type="number" step="0.1" className={inputCls} placeholder="42.5"
                    value={stationForm.hectares} onChange={e => setStationForm(p => ({ ...p, hectares: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Planted Date</label>
                  <input type="date" className={inputCls}
                    value={stationForm.planted_date} onChange={e => setStationForm(p => ({ ...p, planted_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Crop Type</label>
                <select className={inputCls}
                  value={stationForm.crop_type_id} onChange={e => setStationForm(p => ({ ...p, crop_type_id: e.target.value }))}>
                  <option value="">None</option>
                  {cropTypes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.crop_name}{c.variety ? ` — ${c.variety}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Growth Stage</label>
                <input className={inputCls} placeholder="e.g. Tillering, Flowering"
                  value={stationForm.growth_stage} onChange={e => setStationForm(p => ({ ...p, growth_stage: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Wind Override (km/h)</label>
                  <input type="number" step="0.1" className={inputCls} placeholder="Default from crop"
                    value={stationForm.spray_wind_override} onChange={e => setStationForm(p => ({ ...p, spray_wind_override: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Frost Override (°C)</label>
                  <input type="number" step="0.1" className={inputCls} placeholder="Default from crop"
                    value={stationForm.frost_temp_override} onChange={e => setStationForm(p => ({ ...p, frost_temp_override: e.target.value }))} />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors mt-1">
                {saving ? 'Saving…' : 'Save Station'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-4">
              Stations <span className="text-stone-500 font-normal">({stations.length})</span>
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {stations.length === 0 && <div className="text-sm text-stone-500">No stations yet</div>}
              {stations.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStationForm(p => ({ ...p, id: s.id, paddock_name: s.paddock_name || '', hectares: s.hectares?.toString() || '', farmer_id: (s as any).farmer_id || '' }))}
                  className="w-full flex items-start justify-between gap-2 bg-[#161e0c] hover:bg-[#222e16] rounded-lg px-3 py-2.5 border border-[#344a20] text-left transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-stone-200">{s.paddock_name || s.id}</div>
                    <div className="text-xs text-stone-500">
                      {s.id}{s.crop_type && ` · ${s.crop_type.crop_name}`}
                    </div>
                  </div>
                  <div className="text-xs text-stone-500 shrink-0 text-right">
                    {s.farmer?.name || 'Unassigned'}
                    {s.hectares && <div>{s.hectares} ha</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
