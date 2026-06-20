'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Station {
  id: string
  paddock_name: string | null
  latitude: number | null
  longitude: number | null
  weather_readings: Array<{ created_at: string }> | null
  sim_activation_date: string | null
}

interface StationWithHealth extends Station {
  status: 'good' | 'warning' | 'critical'
  lastReadingHours: number | null
  simDaysLeft: number | null
}

export default function StationHealthMap({ stations }: { stations: any[] }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || stations.length === 0) return

    // Calculate health status for each station
    const now = new Date()
    const stationsWithHealth: StationWithHealth[] = stations.map(s => {
      const lastReading = s.weather_readings?.[0]?.created_at
      const lastReadingTime = lastReading ? new Date(lastReading) : null
      const lastReadingHours = lastReadingTime ? Math.round((now.getTime() - lastReadingTime.getTime()) / (1000 * 60 * 60)) : null

      const simActivation = s.sim_activation_date ? new Date(s.sim_activation_date) : null
      const simExpiry = simActivation ? new Date(simActivation.getTime() + 365 * 24 * 60 * 60 * 1000) : null
      const simDaysLeft = simExpiry ? Math.ceil((simExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null

      let status: 'good' | 'warning' | 'critical' = 'good'
      if (lastReadingHours && lastReadingHours > 48) status = 'critical'
      else if (lastReadingHours && lastReadingHours > 24) status = 'warning'
      else if (simDaysLeft && simDaysLeft < 15) status = 'critical'
      else if (simDaysLeft && simDaysLeft < 30) status = 'warning'

      return { ...s, status, lastReadingHours, simDaysLeft }
    })

    // Initialize map
    if (map.current) map.current.remove()
    map.current = L.map(mapContainer.current).setView([-36.5, 142.5], 7) // Center on Wimmera/Mallee region

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current)

    // Add markers
    stationsWithHealth.forEach(s => {
      if (!s.latitude || !s.longitude) return

      const colors = { good: '#10b981', warning: '#f59e0b', critical: '#ef4444' }
      const color = colors[s.status]

      const markerIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">●</div>`,
        iconSize: [30, 30],
        className: 'custom-marker',
      })

      const popup = `
        <div style="font-size: 12px; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 6px;">${s.paddock_name || s.id}</div>
          <div>${s.id}</div>
          ${s.lastReadingHours !== null ? `<div>Last reading: ${s.lastReadingHours}h ago</div>` : '<div>No readings yet</div>'}
          ${s.simDaysLeft !== null ? `<div>SIM: ${s.simDaysLeft > 0 ? `${s.simDaysLeft}d left` : 'Expired'}</div>` : ''}
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 6px;"></span>
            <span style="text-transform: capitalize;">${s.status}</span>
          </div>
        </div>
      `

      L.marker([s.latitude, s.longitude], { icon: markerIcon })
        .bindPopup(popup)
        .addTo(map.current!)
    })
  }, [stations])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Good (last reading &lt;24h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>Warning (24-48h or SIM 15-30d)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Critical (&gt;48h or SIM &lt;15d)</span>
        </div>
      </div>
      <div ref={mapContainer} className="w-full h-96 rounded-lg border border-[#344a20] overflow-hidden" />
    </div>
  )
}
