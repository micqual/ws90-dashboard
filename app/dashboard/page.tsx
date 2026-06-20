'use client'

import { useEffect, useState } from 'react'
import PaddockCard from '@/components/PaddockCard'
import AddPaddockModal from '@/components/AddPaddockModal'

export default function DashboardPage() {
  const [stations, setStations] = useState<any[]>([])
  const [tier, setTier] = useState<'base' | 'pro'>('base')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [showAddPaddock, setShowAddPaddock] = useState(false)

  async function loadData() {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStations(data.stations)
      setTier(data.tier ?? 'base')
      setLastRefresh(new Date())
    } catch (e) {
      setError('Failed to load station data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const suitable = stations.filter(s => {
    const status = s.spray_condition?.status?.toUpperCase()
    return status === 'SUITABLE'
  }).length
  const frostRisk = stations.filter(s => {
    const risk = s.frost?.frost_risk || s.frost?.risk_level
    return risk && risk !== 'NONE' && risk !== 'LOW' && risk !== 'NO RISK'
  }).length
  const harvestReady = stations.filter(s => {
    const status = s.harvest?.status?.toUpperCase()
    return status === 'SUITABLE' || status === 'CAUTION'
  }).length
  const totalHa = stations.reduce((sum, s) => sum + (s.hectares ?? 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-field-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-stone-500">Loading paddock data…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-400">
          <div className="text-4xl mb-3">⚠</div>
          <div className="font-medium">{error}</div>
          <button onClick={loadData} className="mt-3 text-sm text-field-400 hover:underline">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-100">My Paddocks</h1>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              tier === 'pro'
                ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                : 'bg-stone-800/60 text-stone-500 border-stone-700/50'
            }`}>
              {tier.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            {stations.length} station{stations.length !== 1 ? 's' : ''}
            {totalHa > 0 && ` · ${totalHa.toLocaleString()} ha total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddPaddock(true)}
            className="text-xs font-medium text-field-300 border border-field-600 bg-field-900/40 hover:bg-field-800/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Paddock
          </button>
        <button
          onClick={loadData}
          className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1.5 transition-colors"
          title={`Last refresh: ${lastRefresh.toLocaleTimeString()}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
        </div>
      </div>

      {showAddPaddock && (
        <AddPaddockModal
          onClose={() => setShowAddPaddock(false)}
          onCreated={() => { setShowAddPaddock(false); loadData() }}
        />
      )}

      {/* Summary bar */}
      {stations.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold font-mono text-field-300">{stations.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Stations</div>
          </div>
          <div className="card p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${suitable > 0 ? 'text-emerald-400' : 'text-stone-500'}`}>
              {suitable}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Spray OK</div>
          </div>
          <div className="card p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${frostRisk > 0 ? 'text-red-400' : 'text-stone-500'}`}>
              {tier === 'pro' ? frostRisk : '—'}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Frost Risk</div>
          </div>
          <div className="card p-3 text-center">
            <div className={`text-2xl font-bold font-mono ${harvestReady > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
              {tier === 'pro' ? harvestReady : '—'}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Near Harvest</div>
          </div>
        </div>
      )}

      {/* Paddock cards */}
      {stations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🌾</div>
          <h3 className="font-medium text-stone-300 mb-2">No paddocks assigned</h3>
          <p className="text-sm text-stone-500">
            Contact your administrator to assign weather stations to your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {stations.map(station => (
            <PaddockCard key={station.id} station={station} tier={tier} />
          ))}
        </div>
      )}

      <div className="text-center text-xs text-stone-500 pt-2">
        Data refreshes every 5 minutes · Wind in km/h · Rain in mm
      </div>
    </div>
  )
}
