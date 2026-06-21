'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { BOM_STATIONS } from '@/lib/bom-stations'

const StationHealthMap = dynamic(() => import('@/components/StationHealthMap'), { ssr: false })

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
  const [agronomists, setAgronomists] = useState<any[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [activeTab, setActiveTab] = useState<'farmers' | 'stations' | 'map' | 'agronomists'>('farmers')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertStationId, setConvertStationId] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  const [farmerForm, setFarmerForm] = useState({ name: '', email: '', password: '', tier: 'base' })
  const [agronomistForm, setAgronomistForm] = useState({ email: '', name: '', password: '', farmer_id: '' })
  const [stationForm, setStationForm] = useState({
    id: '', farmer_id: '', paddock_name: '', hectares: '',
    crop_type_id: '', planted_date: '', growth_stage: '',
    spray_wind_override: '', frost_temp_override: '',
    sim_phone_number: '', sim_provider: '', sim_activation_date: '', sim_imei: '',
    bom_station_id: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/farmers').then(r => r.json()),
      fetch('/api/admin/stations').then(r => r.json()),
      fetch('/api/admin/crop-types').then(r => r.json()),
      fetch('/api/admin/agronomists').then(r => r.json()),
    ]).then(([f, s, c, a]) => {
      setFarmers(Array.isArray(f) ? f : [])
      setStations(Array.isArray(s) ? s : [])
      setCropTypes(Array.isArray(c) ? c : [])
      setAgronomists(Array.isArray(a) ? a : [])
    }).finally(() => setLoading(false))
  }, [])

  async function handleConvertStation(virtualStationId: string) {
    if (!convertStationId.trim()) {
      setConvertError('Enter the new station ID')
      return
    }
    setConverting(true)
    setConvertError('')
    try {
      const res = await fetch(`/api/stations/${virtualStationId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_station_id: convertStationId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStations(prev => prev.map(s => s.id === virtualStationId ? data : s))
      setConvertingId(null)
      setMessage({ type: 'success', text: `Converted to station "${data.id}"` })
    } catch (err: any) {
      setConvertError(err.message)
    } finally {
      setConverting(false)
    }
  }

  async function createAgronomist(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/agronomists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agronomistForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAgronomists(prev => [...prev, data])
      setAgronomistForm({ email: '', name: '', password: '', farmer_id: '' })
      setMessage({ type: 'success', text: `Agronomist "${data.email}" created` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

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
      setStationForm({ id: '', farmer_id: '', paddock_name: '', hectares: '', crop_type_id: '', planted_date: '', growth_stage: '', spray_wind_override: '', frost_temp_override: '', sim_phone_number: '', sim_provider: '', sim_activation_date: '', sim_imei: '', bom_station_id: '' })
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
        {(['farmers', 'stations', 'map', 'agronomists'] as const).map(tab => (
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
              <div className="border-t border-[#344a20] pt-3 mt-3">
                <div className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2">SIM & Connectivity</div>
                <div>
                  <label className={labelCls}>SIM Phone Number</label>
                  <input type="tel" className={inputCls} placeholder="e.g. +61412345678"
                    value={stationForm.sim_phone_number} onChange={e => setStationForm(p => ({ ...p, sim_phone_number: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className={labelCls}>Provider</label>
                    <select className={inputCls} value={stationForm.sim_provider} onChange={e => setStationForm(p => ({ ...p, sim_provider: e.target.value }))}>
                      <option value="">Select…</option>
                      <option value="Aldi Mobile">Aldi Mobile</option>
                      <option value="Telstra">Telstra</option>
                      <option value="Optus">Optus</option>
                      <option value="Vodafone">Vodafone</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Activation Date</label>
                    <input type="date" className={inputCls}
                      value={stationForm.sim_activation_date} onChange={e => setStationForm(p => ({ ...p, sim_activation_date: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={labelCls}>IMEI (optional)</label>
                  <input type="text" className={inputCls} placeholder="Device identifier"
                    value={stationForm.sim_imei} onChange={e => setStationForm(p => ({ ...p, sim_imei: e.target.value }))} />
                </div>
              </div>
              <div className="border-t border-[#344a20] pt-3 mt-3">
                <div className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2">BoM Station (optional)</div>
                <select className={inputCls} value={stationForm.bom_station_id} onChange={e => setStationForm(p => ({ ...p, bom_station_id: e.target.value }))}>
                  <option value="">None</option>
                  {BOM_STATIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-1.5">Select a nearby BoM weather station for comparison data on paddock cards.</p>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors mt-3">
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
                <div key={s.id}>
                  <button
                    onClick={() => setStationForm(p => ({ ...p, id: s.id, paddock_name: s.paddock_name || '', hectares: s.hectares?.toString() || '', farmer_id: (s as any).farmer_id || '', sim_phone_number: (s as any).sim_phone_number || '', sim_provider: (s as any).sim_provider || '', sim_activation_date: (s as any).sim_activation_date ? (s as any).sim_activation_date.split('T')[0] : '', sim_imei: (s as any).sim_imei || '', bom_station_id: (s as any).bom_station_id || '' }))}
                    className="w-full flex items-start justify-between gap-2 bg-[#161e0c] hover:bg-[#222e16] rounded-lg px-3 py-2.5 border border-[#344a20] text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-stone-200 flex items-center gap-1.5">
                        {s.paddock_name || s.id}
                        {(s as any).is_virtual && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700/50">VIRTUAL</span>}
                      </div>
                      <div className="text-xs text-stone-500">
                        {s.id}{s.crop_type && ` · ${s.crop_type.crop_name}`}
                      </div>
                    </div>
                    <div className="text-xs text-stone-500 shrink-0 text-right">
                      {s.farmer?.name || 'Unassigned'}
                      {s.hectares && <div>{s.hectares} ha</div>}
                    </div>
                  </button>
                  {(s as any).sim_phone_number && (
                    <div className="mt-1 ml-1 text-[10px] text-stone-500">
                      📱 {(s as any).sim_phone_number}{(s as any).sim_provider && ` · ${(s as any).sim_provider}`}
                      {(s as any).sim_activation_date && (() => {
                        const expiry = new Date(new Date((s as any).sim_activation_date).getTime() + 365 * 24 * 60 * 60 * 1000)
                        const now = new Date()
                        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
                        return (
                          <span className={daysLeft < 15 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : 'text-stone-500'}>
                            {' · '}{daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </span>
                        )
                      })()}
                    </div>
                  )}
                  {(s as any).is_virtual && (
                    <div className="mt-1 ml-1">
                      {convertingId !== s.id ? (
                        <button
                          onClick={() => { setConvertingId(s.id); setConvertStationId(''); setConvertError('') }}
                          className="text-[10px] text-field-400 hover:text-field-300 underline underline-offset-2"
                        >
                          📡 Convert to real WS90 station
                        </button>
                      ) : (
                        <div className="bg-[#161e0c] border border-[#344a20] rounded-lg p-2.5 mt-1 space-y-2">
                          <p className="text-[10px] text-stone-500">Enter the new WS90&apos;s device ID. It must have already sent at least one reading.</p>
                          <input
                            type="text"
                            placeholder="e.g. WS90_A1B2C3"
                            value={convertStationId}
                            onChange={e => setConvertStationId(e.target.value)}
                            className="w-full bg-[#1a2310] border border-[#344a20] rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-field-500"
                          />
                          {convertError && (
                            <div className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/50 rounded px-2 py-1">{convertError}</div>
                          )}
                          <div className="flex gap-2">
                            <button
                              disabled={converting}
                              onClick={() => handleConvertStation(s.id)}
                              className="flex-1 bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-1.5 px-3 rounded-lg text-xs"
                            >
                              {converting ? 'Converting…' : 'Convert Now'}
                            </button>
                            <button
                              onClick={() => setConvertingId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs text-stone-400 border border-[#344a20]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="card p-5">
          <h2 className="font-semibold text-stone-200 mb-4">Station Health Map</h2>
          <StationHealthMap stations={stations} />
        </div>
      )}

      {activeTab === 'agronomists' && (
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-4">Create Agronomist</h2>
            <form onSubmit={createAgronomist} className="space-y-3">
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" placeholder="agronomist@example.com" required
                  value={agronomistForm.email} onChange={e => setAgronomistForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="John Smith"
                  value={agronomistForm.name} onChange={e => setAgronomistForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input className={inputCls} type="password" placeholder="••••••••" required
                  value={agronomistForm.password} onChange={e => setAgronomistForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Assign to Farmer</label>
                <select className={inputCls} required
                  value={agronomistForm.farmer_id} onChange={e => setAgronomistForm(p => ({ ...p, farmer_id: e.target.value }))}>
                  <option value="">Select farmer…</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors">
                {saving ? 'Creating…' : 'Create Agronomist'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-4">
              Agronomists <span className="text-stone-500 font-normal">({agronomists.length})</span>
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {agronomists.length === 0 && <div className="text-sm text-stone-500">No agronomists yet</div>}
              {agronomists.map(a => (
                <div key={a.id} className="bg-[#161e0c] rounded-lg px-3 py-2.5 border border-[#344a20]">
                  <div className="text-sm font-medium text-stone-200">{a.name || a.email}</div>
                  <div className="text-xs text-stone-500">{a.email}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Farmer: {a.farmer?.name || 'Unknown'}
                  </div>
                  {!a.active && (
                    <div className="text-xs text-red-400 mt-1">🔒 Disabled</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
