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

  const [form, setForm] = useState({
    paddock_name: station.paddock_name ?? '',
    crop_type_id: station.crop_type_id?.toString() ?? '',
    planted_date: station.planted_date
      ? format(new Date(station.planted_date), 'yyyy-MM-dd')
      : '',
    growth_stage: station.growth_stage ?? '',
    soil_type: station.soil_type ?? 'loam',
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
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. North Block"
              value={form.paddock_name}
              onChange={e => setForm(p => ({ ...p, paddock_name: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>Crop</label>
            <select
              className={inputCls}
              value={form.crop_type_id}
              onChange={e => setForm(p => ({ ...p, crop_type_id: e.target.value }))}
            >
              <option value="">Select crop…</option>
              {cropTypes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.crop_name}{c.variety ? ` — ${c.variety}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Planted Date</label>
            <input
              type="date"
              className={inputCls}
              value={form.planted_date}
              onChange={e => setForm(p => ({ ...p, planted_date: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>Soil Type</label>
            <select
              className={inputCls}
              value={form.soil_type}
              onChange={e => setForm(p => ({ ...p, soil_type: e.target.value }))}
            >
              <option value="sand">Sand</option>
              <option value="sandy loam">Sandy Loam</option>
              <option value="loam">Loam</option>
              <option value="clay loam">Clay Loam</option>
              <option value="clay">Clay</option>
            </select>
          </div>

          {!plantedInPast ? (
            <div>
              <label className={labelCls}>Growth Stage</label>
              <input
                type="text"
                className={inputCls}
                placeholder="e.g. Tillering, Flowering"
                value={form.growth_stage}
                onChange={e => setForm(p => ({ ...p, growth_stage: e.target.value }))}
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Once planted date is set, growth stage is calculated automatically from GDD.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-stone-500 bg-[#161e0c] border border-[#344a20] rounded-lg px-3 py-2">
              <span>🌱</span>
              Growth stage is calculated automatically from GDD once planting date is past.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 border border-[#344a20] hover:border-[#3d5020] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
