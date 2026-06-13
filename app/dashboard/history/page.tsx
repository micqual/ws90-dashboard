'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, CartesianGrid, Legend,
} from 'recharts'

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function HistoryPage() {
  const [stations, setStations] = useState<any[]>([])
  const [selectedStation, setSelectedStation] = useState<string>('')
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [daily, setDaily] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [stationsLoading, setStationsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        const s = (data.stations ?? [])
        setStations(s)
        if (s.length > 0) setSelectedStation(s[0].id)
      })
      .finally(() => setStationsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedStation) return
    const station = stations.find((s: any) => s.id === selectedStation)
    if (station?.planted_date) {
      setFrom(format(new Date(station.planted_date), 'yyyy-MM-dd'))
      setTo(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [selectedStation, stations])

  const loadHistory = useCallback(async () => {
    if (!selectedStation || !from || !to) return
    setLoading(true)
    try {
      const res = await fetch(`/api/history?stationId=${selectedStation}&from=${from}&to=${to}`)
      const data = await res.json()
      setDaily(data.daily ?? [])
      setSummary(data.summary ?? null)
    } catch (e) {
      setDaily([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [selectedStation, from, to])

  useEffect(() => {
    if (selectedStation) loadHistory()
  }, [selectedStation, loadHistory])

  function applyPreset(days: number) {
    setFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
    setTo(format(new Date(), 'yyyy-MM-dd'))
  }

  function applySeasonToDate() {
    const station = stations.find((s: any) => s.id === selectedStation)
    if (station?.planted_date) {
      setFrom(format(new Date(station.planted_date), 'yyyy-MM-dd'))
      setTo(format(new Date(), 'yyyy-MM-dd'))
    }
  }

  const chartData = daily.map(d => ({
    ...d,
    day: format(parseISO(String(d.day).split('T')[0]), 'd MMM'),
  }))

  const inputCls = `bg-[#1e2812] border border-[#344a20] rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-field-500 transition-colors`
  const hasSeason = stations.find((s: any) => s.id === selectedStation)?.planted_date

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Weather History</h1>
        <p className="text-sm text-stone-500 mt-0.5">Daily rainfall and temperature by paddock</p>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-stone-500 mb-1.5 uppercase tracking-wider">Paddock</label>
            <select className={inputCls + ' w-full'} value={selectedStation} onChange={e => setSelectedStation(e.target.value)} disabled={stationsLoading}>
              {stationsLoading && <option>Loading…</option>}
              {stations.map((s: any) => (
                <option key={s.id} value={s.id}>{s.paddock_name || s.id}{s.crop_type ? ` · ${s.crop_type.crop_name}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5 uppercase tracking-wider">From</label>
            <input type="date" className={inputCls} value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5 uppercase tracking-wider">To</label>
            <input type="date" className={inputCls} value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={loadHistory} disabled={loading} className="bg-field-700 hover:bg-field-600 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors">
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {hasSeason && (
            <button onClick={applySeasonToDate} className="text-xs px-3 py-1.5 rounded-lg border border-field-600 text-field-400 hover:bg-field-800/50 transition-colors">
              🌱 Season to date
            </button>
          )}
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.days)} className="text-xs px-3 py-1.5 rounded-lg border border-[#344a20] text-stone-400 hover:text-stone-200 hover:border-field-600 transition-colors">
              Last {p.label}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="card p-3 text-center"><div className="text-2xl font-bold font-mono text-blue-400">{summary.total_rain_mm}</div><div className="text-xs text-stone-500 mt-0.5">Total mm</div></div>
          <div className="card p-3 text-center"><div className="text-2xl font-bold font-mono text-blue-300">{summary.rainy_days}</div><div className="text-xs text-stone-500 mt-0.5">Rain days</div></div>
          <div className="card p-3 text-center"><div className="text-2xl font-bold font-mono text-orange-400">{summary.avg_temp !== null ? `${summary.avg_temp}°` : '—'}</div><div className="text-xs text-stone-500 mt-0.5">Avg temp</div></div>
          <div className="card p-3 text-center"><div className="text-2xl font-bold font-mono text-red-400">{summary.max_temp !== null ? `${summary.max_temp}°` : '—'}</div><div className="text-xs text-stone-500 mt-0.5">Max temp</div></div>
          <div className="card p-3 text-center"><div className="text-2xl font-bold font-mono text-sky-400">{summary.min_temp !== null ? `${summary.min_temp}°` : '—'}</div><div className="text-xs text-stone-500 mt-0.5">Min temp</div></div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-2 border-field-600 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && daily.length === 0 && selectedStation && (
        <div className="card p-12 text-center"><div className="text-4xl mb-3">📭</div><div className="text-stone-400">No data for this period</div></div>
      )}

      {!loading && daily.length > 0 && (
        <>
          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-1">Daily Rainfall</h2>
            <p className="text-xs text-stone-500 mb-4">mm per day</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3c18" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} unit=" mm" />
                <Tooltip contentStyle={{ background: '#222e16', border: '1px solid #344a20', borderRadius: '8px', fontSize: '12px', color: '#e7e5e4' }} formatter={(val: any) => [`${Number(val).toFixed(1)} mm`, 'Rain']} />
                <Bar dataKey="rain_total" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-stone-200 mb-1">Daily Temperature</h2>
            <p className="text-xs text-stone-500 mb-4">°C — min, average, max</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="tempRange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3c18" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} unit="°" />
                <Tooltip contentStyle={{ background: '#222e16', border: '1px solid #344a20', borderRadius: '8px', fontSize: '12px', color: '#e7e5e4' }} formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}°C`, name === 'temp_max' ? 'Max' : name === 'temp_min' ? 'Min' : 'Avg']} />
                <Legend formatter={(value) => value === 'temp_max' ? 'Max' : value === 'temp_min' ? 'Min' : 'Avg'} wrapperStyle={{ fontSize: '11px', color: '#78716c' }} />
                <Area type="monotone" dataKey="temp_max" stroke="#ef4444" strokeWidth={1.5} fill="url(#tempRange)" dot={false} />
                <Line type="monotone" dataKey="temp_avg" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="temp_min" stroke="#38bdf8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header"><h2 className="font-semibold text-stone-200">Daily Summary</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#344a20]">
                    {['Date', 'Rain mm', 'Min °C', 'Avg °C', 'Max °C', 'Wind km/h'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs text-stone-500 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...daily].reverse().map((d, i) => (
                    <tr key={String(d.day)} className={`border-b border-[#2a3c18] ${i % 2 === 0 ? '' : 'bg-[#1e2812]/40'}`}>
                      <td className="px-4 py-2.5 text-stone-300 font-medium">{format(parseISO(String(d.day).split('T')[0]), 'd MMM yyyy')}</td>
                      <td className="px-4 py-2.5 font-mono text-blue-400">{d.rain_total > 0 ? d.rain_total.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-sky-400">{d.temp_min !== null ? d.temp_min.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-orange-400">{d.temp_avg !== null ? d.temp_avg.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-red-400">{d.temp_max !== null ? d.temp_max.toFixed(1) : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-violet-400">{d.wind_max_kmh !== null ? d.wind_max_kmh.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <div className="text-center text-xs text-stone-600 pb-2">Daily totals · Times in Australian Central Time</div>
    </div>
  )
}
