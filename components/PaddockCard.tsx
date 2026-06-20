'use client'

import { useState } from 'react'
import { formatTemp, formatWind, formatRain, degToCompass, batteryPercent, formatDewPoint } from '@/lib/units'
import { format } from 'date-fns'
import SprayBadge from './SprayBadge'
import GDDBar from './GDDBar'
import FrostAlert from './FrostAlert'
import WeatherChart from './WeatherChart'
import PaddockSettings from './PaddockSettings'
import HarvestBadge from './HarvestBadge'
import DiseaseRisk from './DiseaseRisk'
import IrrigationLog from './IrrigationLog'
import DryingConditions from './DryingConditions'

interface PaddockCardProps {
  station: any
  tier: 'base' | 'pro'
}

export default function PaddockCard({ station: initialStation, tier }: PaddockCardProps) {
  const [station, setStation] = useState(initialStation)
  const [showChart, setShowChart] = useState<'temperature' | 'rain' | 'wind' | 'humidity' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [lastIrrigation, setLastIrrigation] = useState(initialStation.last_irrigation)

  const reading = station.latest_reading
  const crop = station.crop_type
  const spray = station.spray_condition
  const gdd = station.gdd
  const frost = station.frost
  const harvest = station.harvest
  const disease = station.disease
  const drying = station.drying
  const isPro = tier === 'pro'

  const sprayStatus = spray?.status ?? spray?.spray_status ?? spray?.condition
  const battPct = batteryPercent(reading?.battery_mv)

  function handleSaved(updated: any) {
    setStation((prev: any) => ({
      ...prev,
      ...updated,
    }))
    setShowSettings(false)
  }

  return (
    <div className="card overflow-hidden hover:border-[#3d5020] transition-colors">
      {/* Card header */}
      <div className="card-header flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-stone-100 text-base truncate">
            {station.paddock_name || station.id}
          </h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {crop ? (
              <span className="text-xs text-field-400 font-medium">
                {crop.crop_name}{crop.variety ? ` · ${crop.variety}` : ''}
              </span>
            ) : (
              <button
                onClick={() => setShowSettings(true)}
                className="text-xs text-stone-500 hover:text-field-400 transition-colors underline underline-offset-2"
              >
                Set crop…
              </button>
            )}
            {station.hectares && (
              <span className="text-xs text-stone-500">{station.hectares} ha</span>
            )}
            {station.planted_date ? (
              <span className="text-xs text-stone-500">
                Planted {format(new Date(station.planted_date), 'd MMM yyyy')}
              </span>
            ) : (
              !crop && null
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SprayBadge status={sprayStatus} />
          {/* Settings cog */}
          <button
            onClick={() => setShowSettings(s => !s)}
            title="Paddock settings"
            className={`p-1 rounded-md transition-colors ${
              showSettings
                ? 'text-field-400 bg-field-900/50'
                : 'text-stone-500 hover:text-stone-400 hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.294 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.294A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.379 3.03l1.25.834a6.957 6.957 0 011.416-.587l.294-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Frost alert — Pro only */}
      {isPro && frost && (
        <div className="px-4 pt-3">
          <FrostAlert frost={frost} />
        </div>
      )}

      {/* Harvest conditions — Pro only, shown when near harvest */}
      {isPro && harvest && harvest.status !== 'NOT READY' && (
        <div className="px-4 pt-3">
          <HarvestBadge harvest={harvest} />
        </div>
      )}

      {/* Weather stats */}
      {reading ? (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setShowChart(showChart === 'temperature' ? null : 'temperature')}
              className={`rounded-lg p-3 text-left transition-colors border ${
                showChart === 'temperature'
                  ? 'bg-orange-950/40 border-orange-800/50'
                  : 'bg-[#161e0c] border-[#344a20] hover:border-[#3d5020]'
              }`}
            >
              <div className="stat-label">Temp</div>
              <div className="stat-value text-orange-400">{formatTemp(reading.temperature_c)}</div>
            </button>

            <button
              onClick={() => setShowChart(showChart === 'humidity' ? null : 'humidity')}
              className={`rounded-lg p-3 text-left transition-colors border ${
                showChart === 'humidity'
                  ? 'bg-sky-950/40 border-sky-800/50'
                  : 'bg-[#161e0c] border-[#344a20] hover:border-[#4a6a2c]'
              }`}
            >
              <div className="stat-label">Humidity</div>
              <div className="stat-value text-sky-400">
                {reading.humidity != null ? `${reading.humidity.toFixed(0)}%` : '—'}
              </div>
            </button>

            <button
              onClick={() => setShowChart(showChart === 'wind' ? null : 'wind')}
              className={`rounded-lg p-3 text-left transition-colors border ${
                showChart === 'wind'
                  ? 'bg-violet-950/40 border-violet-800/50'
                  : 'bg-[#161e0c] border-[#344a20] hover:border-[#3d5020]'
              }`}
            >
              <div className="stat-label">
                Wind {reading.wind_dir_deg != null && `· ${degToCompass(reading.wind_dir_deg)}`}
              </div>
              <div className="stat-value text-violet-400">{formatWind(reading.wind_avg_ms)}</div>
              {reading.wind_max_ms != null && (
                <div className="text-[10px] text-stone-500 mt-0.5 font-mono">
                  Max {formatWind(reading.wind_max_ms)}
                </div>
              )}
            </button>

            <button
              onClick={() => setShowChart(showChart === 'rain' ? null : 'rain')}
              className={`rounded-lg p-3 text-left transition-colors border ${
                showChart === 'rain'
                  ? 'bg-blue-950/40 border-blue-800/50'
                  : 'bg-[#161e0c] border-[#344a20] hover:border-[#3d5020]'
              }`}
            >
              <div className="stat-label">Rainfall</div>
              <div className="stat-value text-blue-400">{formatRain(reading.rain_mm)}</div>
            </button>
          </div>

          {/* Chart panel */}
          {showChart && (
            <div className="bg-[#161e0c] rounded-lg p-3 border border-[#344a20]">
              <div className="text-xs text-stone-500 mb-2 capitalize">
                {showChart} — last 48 readings
              </div>
              <WeatherChart stationId={station.id} metric={showChart} />
            </div>
          )}

          {/* Secondary stats */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-stone-500">
            {reading.uvi != null && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-500">☀</span>
                UV {reading.uvi.toFixed(1)}
              </span>
            )}
            {reading.temperature_c != null && reading.humidity != null && (
              <span className="flex items-center gap-1">
                <span className="text-sky-600">💧</span>
                Dew {formatDewPoint(reading.temperature_c, reading.humidity)}
              </span>
            )}
            {reading.battery_mv != null && (
              <span className="flex items-center gap-1.5">
                <span className={battPct > 20 ? 'text-green-500' : 'text-red-500'}>⚡</span>
                Battery {battPct}%
              </span>
            )}
            {reading.rssi != null && (
              <span>Signal {reading.rssi} dBm</span>
            )}
            <span className="ml-auto text-stone-500">
              {format(new Date(reading.created_at), 'd MMM HH:mm')}
            </span>
          </div>

          {/* GDD — Pro only */}
          {isPro && (gdd || crop?.target_gdd_harvest) && (
            <div className="pt-2 border-t border-[#344a20]">
              <GDDBar
                gdd={gdd}
                cropName={crop?.crop_name}
              />
            </div>
          )}

          {/* Disease risk — Pro only */}
          {isPro && disease && (
            <div className="pt-2 border-t border-[#344a20]">
              <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-medium">Disease Risk</div>
              <DiseaseRisk disease={disease} cropName={crop?.crop_name} />
            </div>
          )}

          {isPro && drying && (
            <div className="pt-2 border-t border-[#344a20]">
              <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-medium">Drying Conditions</div>
              <DryingConditions drying={drying} />
            </div>
          )}

          {/* Spray details */}
          {spray && (
            <div className="pt-2 border-t border-[#344a20]">
              <div className="text-xs text-stone-500 mb-2 uppercase tracking-wider font-medium">Spray window</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {spray.wind_speed_kmh != null && (
                  <div className="flex justify-between bg-[#161e0c] rounded px-2 py-1 border border-[#344a20]">
                    <span className="text-stone-500">Wind</span>
                    <span className="font-mono text-stone-300">{Number(spray.wind_speed_kmh).toFixed(1)} km/h</span>
                  </div>
                )}
                {spray.humidity != null && (
                  <div className="flex justify-between bg-[#161e0c] rounded px-2 py-1 border border-[#344a20]">
                    <span className="text-stone-500">Humidity</span>
                    <span className="font-mono text-stone-300">{Number(spray.humidity).toFixed(0)}%</span>
                  </div>
                )}
                {spray.temperature_c != null && (
                  <div className="flex justify-between bg-[#161e0c] rounded px-2 py-1 border border-[#344a20]">
                    <span className="text-stone-500">Temp</span>
                    <span className="font-mono text-stone-300">{Number(spray.temperature_c).toFixed(1)}°C</span>
                  </div>
                )}
                {spray.delta_t != null && (
                  <div className={`flex justify-between rounded px-2 py-1 border ${
                    spray.delta_t_zone === 'OPTIMAL' ? 'bg-emerald-950/40 border-emerald-800/50' :
                    spray.delta_t_zone === 'MARGINAL' ? 'bg-amber-950/40 border-amber-800/50' :
                    'bg-red-950/40 border-red-800/50'
                  }`}>
                    <span className="text-stone-500">Delta T</span>
                    <span className={`font-mono font-bold ${
                      spray.delta_t_zone === 'OPTIMAL' ? 'text-emerald-400' :
                      spray.delta_t_zone === 'MARGINAL' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>{Number(spray.delta_t).toFixed(1)}°C</span>
                  </div>
                )}
              </div>
              {spray.delta_t_zone && (
                <div className="text-[10px] text-stone-500 mt-1.5">
                  Delta T: <span className="font-medium">{spray.delta_t_zone}</span>
                  {spray.delta_t_zone === 'TOO HUMID' && ' — poor drying, runoff risk'}
                  {spray.delta_t_zone === 'OPTIMAL' && ' — best spraying conditions'}
                  {spray.delta_t_zone === 'MARGINAL' && ' — use coarser droplets'}
                  {spray.delta_t_zone === 'TOO DRY' && ' — high evaporation, drift risk'}
                </div>
              )}
              {spray.reason && (
                <div className="text-xs text-stone-500 mt-2 italic">{spray.reason}</div>
              )}
            </div>
          )}
          {/* Irrigation log */}
          <div className="pt-2 border-t border-[#344a20]">
            <IrrigationLog
              stationId={station.id}
              lastIrrigation={lastIrrigation}
              onLogged={event => setLastIrrigation(event)}
            />
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-stone-500 text-sm">
          No weather readings yet for this station
        </div>
      )}

      {/* Paddock settings panel */}
      {showSettings && (
        <PaddockSettings
          station={station}
          onSaved={handleSaved}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="px-4 py-2 border-t border-[#344a20] flex items-center justify-between">
        <span className="text-[10px] font-mono text-stone-500">ID: {station.id}</span>
        {(gdd?.stage_name || station.growth_stage) && (
          <span className="text-[10px] text-stone-500 flex items-center gap-1">
            {gdd?.stage_icon && <span>{gdd.stage_icon}</span>}
            <span className="capitalize">{gdd?.stage_name ?? station.growth_stage}</span>
            {!gdd?.stage_name && station.growth_stage && (
              <span className="text-stone-500 ml-1">(manual)</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
