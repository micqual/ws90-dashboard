'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface PaddockSettingsProps {
  station: any
  onSaved: (updated: any) => void
  onClose: () => void
}

export default function PaddockSettings({ station, onSaved, onClose }: PaddockSettingsProps) {
  const [cropTypes, setCropTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showLocation, setShowLocation] = useState(false)
  const [showFarmDetails, setShowFarmDetails] = useState(false)
  const [showSim, setShowSim] = useState(false)


  const [form, setForm] = useState({
    paddock_name: station.paddock_name ?? '',
    crop_type_id: station.crop_type_id?.toString() ?? '',
    planted_date: station.planted_date
      ? format(new Date(station.planted_date), 'yyyy-MM-dd')
      : '',
    growth_stage: station.growth_stage ?? '',
    soil_type: station.soil_type ?? 'loam',
    target_yield_t_ha: station.target_yield_t_ha?.toString() ?? '',
    farm_name: station.farm_name ?? '',
    farm_address: station.farm_address ?? '',
    latitude: station.latitude?.toString() ?? '',
    longitude: station.longitude?.toString() ?? '',
    elevation_m: station.elevation_m?.toString() ?? '',
    installation_date: station.installation_date
      ? format(new Date(station.installation_date), 'yyyy-MM-dd')
      : '',
    paddock_notes: station.paddock_notes ?? '',
    sim_phone_number: station.sim_phone_number ?? '',
    sim_provider: station.sim_provider ?? '',
    sim_activation_date: station.sim_activation_date
      ? format(new Date(station.sim_activation_date), 'yyyy-MM-dd')
      : '',
    sim_imei: station.sim_imei ?? '',
    agronomist_name: station.agronomist_name ?? '',
    agronomist_company: station.agronomist_company ?? '',
    agronomist_phone: station.agronomist_phone ?? '',
  })

  const hasPlantedDate = !!form.planted_date
  const plantedInPast = hasPlantedDate && new Date(form.planted_date) <= new Date()

  useEffect(() => {
    fetch('/api/admin/crop-types')
      .then(r => r.json())
      .then(data => setCropTypes(Array.isArray(data) ? data : []))
      .catch(() => setCropTypes([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/stations/${station.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      onSaved(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm
    placeholder:text-stone-500 focus:outline-none focus:border-field-500 focus:ring-1 focus:ring-field-500/30 transition-colors`
  const labelCls = 'block text-xs text-stone-500 mb-1.5 uppercase tracking-wider'
  const sectionHeaderCls = 'flex items-center justify-between cursor-pointer py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors uppercase tracking-wider font-medium'

  return (
    <div className="border-t border-[#344a20] bg-[#1e2812] px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-stone-300">Paddock Settings</h3>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-400 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-500 py-2">
          <div className="w-4 h-4 border-2 border-field-600 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={labelCls}>Paddock Name</label>
            <input type="text" className={inputCls} placeholder="e.g. North Block"
              value={form.paddock_name} onChange={e => setForm(p => ({ ...p, paddock_name: e.target.value }))} />
          </div>

          <div>
            <label className={labelCls}>Crop</label>
            <select className={inputCls} value={form.crop_type_id} onChange={e => setForm(p => ({ ...p, crop_type_id: e.target.value }))}>
              <option value="">Select crop…</option>
              {cropTypes.map(c => (
                <option key={c.id} value={c.id}>{c.crop_name}{c.variety ? ` — ${c.variety}` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Planted Date</label>
            <input type="date" className={inputCls} value={form.planted_date}
              onChange={e => setForm(p => ({ ...p, planted_date: e.target.value }))} />
          </div>

          <div>
            <label className={labelCls}>Soil Type</label>
            <select className={inputCls} value={form.soil_type} onChange={e => setForm(p => ({ ...p, soil_type: e.target.value }))}>
              <option value="sand">Sand</option>
              <option value="sandy loam">Sandy Loam</option>
              <option value="loam">Loam</option>
              <option value="clay loam">Clay Loam</option>
              <option value="clay">Clay</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Target Yield (t/ha)</label>
            <input type="number" step="0.1" className={inputCls}
              placeholder="e.g. 3.5 — leave blank to use crop average"
              value={form.target_yield_t_ha} onChange={e => setForm(p => ({ ...p, target_yield_t_ha: e.target.value }))} />
          </div>

          {!plantedInPast ? (
            <div>
              <label className={labelCls}>Growth Stage</label>
              <input type="text" className={inputCls} placeholder="e.g. Tillering, Flowering"
                value={form.growth_stage} onChange={e => setForm(p => ({ ...p, growth_stage: e.target.value }))} />
              <p className="text-[10px] text-stone-500 mt-1">Once planted date is set, growth stage is calculated automatically from GDD.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-stone-500 bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2">
              <span>🌱</span>
              Growth stage is calculated automatically from GDD once planting date is past.
            </div>
          )}

          {/* Farm Details — collapsible */}
          <div className="border-t border-[#344a20] pt-2">
            <div className={sectionHeaderCls} onClick={() => setShowFarmDetails(s => !s)}>
              <span>Farm Details</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showFarmDetails ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {showFarmDetails && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className={labelCls}>Farm Name</label>
                  <input type="text" className={inputCls} placeholder="e.g. Pankhurst Farming"
                    value={form.farm_name} onChange={e => setForm(p => ({ ...p, farm_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Farm Address</label>
                  <input type="text" className={inputCls} placeholder="e.g. 247 Doddridge Rd, Bute SA 5560"
                    value={form.farm_address} onChange={e => setForm(p => ({ ...p, farm_address: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Paddock Notes</label>
                  <textarea className={inputCls} rows={2} placeholder="e.g. North facing, history of barley yellow dwarf"
                    value={form.paddock_notes} onChange={e => setForm(p => ({ ...p, paddock_notes: e.target.value }))} />
                </div>
                <div className="border-t border-[#344a20] pt-3">
                  <label className={labelCls}>Agronomist Name</label>
                  <input type="text" className={inputCls} placeholder="e.g. Sarah Chen"
                    value={form.agronomist_name} onChange={e => setForm(p => ({ ...p, agronomist_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Agronomist Company</label>
                  <input type="text" className={inputCls} placeholder="e.g. Landmark Agronomy"
                    value={form.agronomist_company} onChange={e => setForm(p => ({ ...p, agronomist_company: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Agronomist Phone</label>
                  <input type="text" className={inputCls} placeholder="e.g. 0418 555 234"
                    value={form.agronomist_phone} onChange={e => setForm(p => ({ ...p, agronomist_phone: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {/* Station Location — collapsible */}
          <div className="border-t border-[#344a20] pt-2">
            <div className={sectionHeaderCls} onClick={() => setShowLocation(s => !s)}>
              <span>Station Location</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showLocation ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {showLocation && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Latitude</label>
                    <input type="number" step="0.0001" className={inputCls} placeholder="-33.8721"
                      value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Longitude</label>
                    <input type="number" step="0.0001" className={inputCls} placeholder="138.0142"
                      value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Elevation (m)</label>
                    <input type="number" step="1" className={inputCls} placeholder="142"
                      value={form.elevation_m} onChange={e => setForm(p => ({ ...p, elevation_m: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Install Date</label>
                    <input type="date" className={inputCls}
                      value={form.installation_date} onChange={e => setForm(p => ({ ...p, installation_date: e.target.value }))} />
                  </div>
                </div>
                <p className="text-[10px] text-stone-500">
                  Find coordinates with Google Maps (long press → drop pin) or GPS Status app. Elevation from{' '}
                  <a href="https://elevation.fsdf.org.au" target="_blank" className="text-field-400 underline">elevation.fsdf.org.au</a>
                </p>
              </div>
            )}
          </div>

          {/* SIM & Connectivity — collapsible */}
          <div className="border-t border-[#344a20] pt-2">
            <div className={sectionHeaderCls} onClick={() => setShowSim(s => !s)}>
              <span>SIM & Connectivity</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showSim ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {showSim && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className={labelCls}>SIM Phone Number</label>
                  <input type="tel" className={inputCls} placeholder="e.g. +61412345678"
                    value={form.sim_phone_number} onChange={e => setForm(p => ({ ...p, sim_phone_number: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Provider</label>
                  <select className={inputCls} value={form.sim_provider} onChange={e => setForm(p => ({ ...p, sim_provider: e.target.value }))}>
                    <option value="">Select provider…</option>
                    <option value="Aldi Mobile">Aldi Mobile</option>
                    <option value="Telstra">Telstra</option>
                    <option value="Optus">Optus</option>
                    <option value="Vodafone">Vodafone</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>SIM Activation Date</label>
                    <input type="date" className={inputCls}
                      value={form.sim_activation_date} onChange={e => setForm(p => ({ ...p, sim_activation_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>IMEI (optional)</label>
                    <input type="text" className={inputCls} placeholder="Device identifier"
                      value={form.sim_imei} onChange={e => setForm(p => ({ ...p, sim_imei: e.target.value }))} />
                  </div>
                </div>
                {form.sim_activation_date && (
                  <div className="text-[10px] text-stone-500 bg-[#161e0c] rounded-lg px-2.5 py-1.5">
                    Plan expires: {new Date(new Date(form.sim_activation_date).getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>

          {station.is_virtual && (
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2 text-xs text-amber-300">
              📡 This is a virtual paddock with no WS90 installed. Ask your administrator to convert it once a station is ready.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 border border-[#344a20] hover:border-[#3d5020] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
