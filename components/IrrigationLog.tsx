'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'

interface IrrigationLogProps {
  stationId: string
  lastIrrigation: any
  onLogged: (event: any) => void
}

const TYPE_LABELS: Record<string, string> = {
  overhead: '🌧 Overhead',
  drip: '💧 Drip',
  furrow: '🌊 Furrow',
}

export default function IrrigationLog({ stationId, lastIrrigation, onLogged }: IrrigationLogProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    type: 'overhead',
    amount_mm: '',
    duration_min: '',
    notes: '',
    irrigated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  })

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/stations/${stationId}/irrigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to log')
      onLogged(data)
      setShowForm(false)
      setForm({
        type: 'overhead',
        amount_mm: '',
        duration_min: '',
        notes: '',
        irrigated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full bg-[#0e1108] border border-[#2a3518] rounded-lg px-3 py-2 text-stone-100 text-sm
    placeholder:text-stone-600 focus:outline-none focus:border-field-500 focus:ring-1 focus:ring-field-500/30 transition-colors`
  const labelCls = 'block text-xs text-stone-500 mb-1.5 uppercase tracking-wider'

  // Check if recent overhead irrigation (within 48h)
  const recentOverhead = lastIrrigation &&
    lastIrrigation.type === 'overhead' &&
    new Date(lastIrrigation.irrigated_at) > new Date(Date.now() - 48 * 60 * 60 * 1000)

  return (
    <div className="border-t border-[#2a3518] pt-3 mt-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-500 uppercase tracking-wider font-medium">Irrigation</span>
        <button
          onClick={() => setShowForm(s => !s)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            showForm
              ? 'bg-sky-900/40 border-sky-700/50 text-sky-300'
              : 'border-[#2a3518] text-stone-500 hover:text-stone-300 hover:border-[#3d5020]'
          }`}
        >
          + Log event
        </button>
      </div>

      {/* Last irrigation summary */}
      {lastIrrigation ? (
        <div className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 border ${
          recentOverhead
            ? 'bg-sky-950/40 border-sky-800/50 text-sky-300'
            : 'bg-[#0e1108] border-[#2a3518] text-stone-500'
        }`}>
          <div className="flex items-center gap-2">
            <span>{TYPE_LABELS[lastIrrigation.type] ?? lastIrrigation.type}</span>
            {lastIrrigation.amount_mm && (
              <span className="font-mono">{Number(lastIrrigation.amount_mm).toFixed(0)} mm</span>
            )}
            {recentOverhead && (
              <span className="text-[10px] bg-sky-900/60 text-sky-300 border border-sky-700/50 px-1.5 py-0.5 rounded font-mono font-bold">
                ACTIVE
              </span>
            )}
          </div>
          <span className="text-stone-600 text-[10px]">
            {formatDistanceToNow(new Date(lastIrrigation.irrigated_at), { addSuffix: true })}
          </span>
        </div>
      ) : (
        <div className="text-xs text-stone-700 italic">No irrigation logged</div>
      )}

      {/* Overhead hold-off warning */}
      {recentOverhead && (
        <div className="mt-2 text-[10px] text-sky-400 bg-sky-950/30 border border-sky-800/40 rounded px-2 py-1.5">
          Overhead irrigation active — disease risk paused, harvest hold-off in effect for 48h
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <form onSubmit={handleLog} className="mt-3 space-y-3 bg-[#111608] border border-[#2a3518] rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select
                className={inputCls}
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                <option value="overhead">Overhead / sprinkler</option>
                <option value="drip">Drip / subsurface</option>
                <option value="furrow">Furrow / flood</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date & time</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.irrigated_at}
                onChange={e => setForm(p => ({ ...p, irrigated_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount (mm)</label>
              <input
                type="number"
                step="0.5"
                className={inputCls}
                placeholder="e.g. 25"
                value={form.amount_mm}
                onChange={e => setForm(p => ({ ...p, amount_mm: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Duration (min)</label>
              <input
                type="number"
                className={inputCls}
                placeholder="e.g. 120"
                value={form.duration_min}
                onChange={e => setForm(p => ({ ...p, duration_min: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Block 2 only, full run"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {form.type === 'overhead' && (
            <div className="text-[10px] text-sky-400 bg-sky-950/30 border border-sky-800/40 rounded px-2 py-1.5">
              Overhead irrigation — disease risk readings will be paused for 4h, harvest hold-off for 48h
            </div>
          )}
          {form.type === 'drip' && (
            <div className="text-[10px] text-stone-500 bg-[#0e1108] border border-[#2a3518] rounded px-2 py-1.5">
              Drip / subsurface — canopy readings unaffected, no hold-offs applied
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors">
              {saving ? 'Logging…' : 'Log irrigation'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-stone-400 hover:text-stone-200 border border-[#2a3518] hover:border-[#3d5020] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
