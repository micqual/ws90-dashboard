'use client'

import { useState, useEffect } from 'react'

interface AddPaddockModalProps {
  onClose: () => void
  onCreated: (station: any) => void
}

export default function AddPaddockModal({ onClose, onCreated }: AddPaddockModalProps) {
  const [cropTypes, setCropTypes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    paddock_name: '',
    crop_type_id: '',
    planted_date: '',
    hectares: '',
    soil_type: 'loam',
    target_yield_t_ha: '',
    farm_name: '',
    farm_address: '',
    latitude: '',
    longitude: '',
  })

  useEffect(() => {
    fetch('/api/admin/crop-types')
      .then(r => r.json())
      .then(data => setCropTypes(Array.isArray(data) ? data : []))
      .catch(() => setCropTypes([]))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.paddock_name.trim()) {
      setError('Paddock name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/stations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create paddock')
      onCreated(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm
    placeholder:text-stone-500 focus:outline-none focus:border-field-500 focus:ring-1 focus:ring-field-500/30 transition-colors`
  const labelCls = 'block text-xs text-stone-500 mb-1.5 uppercase tracking-wider'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#1e2812] border border-[#344a20] rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#344a20]">
          <h3 className="font-semibold text-stone-200">Add Paddock</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="bg-field-900/30 border border-field-700/40 rounded-lg px-3 py-2 text-xs text-field-300">
            This creates a paddock without a physical WS90 station. You can track soil tests, nitrogen applications and yield projections — weather-dependent features (spray window, frost, disease risk) won&apos;t be available unless a nearby station is linked later.
          </div>

          <div>
            <label className={labelCls}>Paddock Name *</label>
            <input type="text" className={inputCls} placeholder="e.g. South Block" required
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Planted Date</label>
              <input type="date" className={inputCls} value={form.planted_date} onChange={e => setForm(p => ({ ...p, planted_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Hectares</label>
              <input type="number" step="0.1" className={inputCls} placeholder="e.g. 85" value={form.hectares} onChange={e => setForm(p => ({ ...p, hectares: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <input type="number" step="0.1" className={inputCls} placeholder="optional" value={form.target_yield_t_ha} onChange={e => setForm(p => ({ ...p, target_yield_t_ha: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Farm Name</label>
            <input type="text" className={inputCls} placeholder="optional" value={form.farm_name} onChange={e => setForm(p => ({ ...p, farm_name: e.target.value }))} />
          </div>

          <div>
            <label className={labelCls}>Farm Address</label>
            <input type="text" className={inputCls} placeholder="optional" value={form.farm_address} onChange={e => setForm(p => ({ ...p, farm_address: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Latitude</label>
              <input type="number" step="0.0001" className={inputCls} placeholder="optional" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input type="number" step="0.0001" className={inputCls} placeholder="optional" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors">
              {saving ? 'Creating…' : 'Create Paddock'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 border border-[#344a20] hover:border-[#3d5020] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
