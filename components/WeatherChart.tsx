'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { msToKmh } from '@/lib/units'

interface WeatherChartProps {
  stationId: string
  metric: 'temperature' | 'rain' | 'wind'
}

export default function WeatherChart({ stationId, metric }: WeatherChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stations/${stationId}/history`)
      .then(r => r.json())
      .then(readings => {
        const chart = readings.map((r: any) => ({
          time: format(new Date(r.created_at), 'HH:mm'),
          value: metric === 'temperature'
            ? r.temperature_c
            : metric === 'rain'
            ? r.rain_mm
            : msToKmh(r.wind_avg_ms),
        }))
        setData(chart)
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [stationId, metric])

  if (loading) {
    return (
      <div className="h-16 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-field-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data.length) {
    return <div className="h-16 flex items-center justify-center text-xs text-stone-500">No history</div>
  }

  const colors = {
    temperature: '#f97316',
    rain: '#3b82f6',
    wind: '#8b5cf6',
  }

  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[metric]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors[metric]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <Tooltip
          contentStyle={{
            background: '#161d0e',
            border: '1px solid #2a3518',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#e7e5e4',
          }}
          itemStyle={{ color: colors[metric] }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors[metric]}
          strokeWidth={1.5}
          fill={`url(#grad-${metric})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
