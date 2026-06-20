'use client'

import { useState } from 'react'

interface Section {
  id: string
  title: string
  content: React.ReactNode
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#1a2310] border border-[#344a20] rounded-lg p-3 text-xs text-field-300 font-mono overflow-x-auto whitespace-pre">
      {children}
    </pre>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-xs my-2">
      <thead>
        <tr className="border-b border-[#344a20]">
          {headers.map(h => <th key={h} className="px-2 py-1.5 text-left text-stone-500 uppercase tracking-wider">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`border-b border-[#2a3c18] ${i % 2 === 0 ? '' : 'bg-[#1e2812]/40'}`}>
            {row.map((cell, j) => <td key={j} className="px-2 py-1.5 text-stone-300">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const sections: Section[] = [
  {
    id: 'gauges',
    title: 'Farm Yield Overview Gauges',
    content: (
      <>
        <p>Each semicircle gauge shows what percentage of target N demand has been met by available soil nitrogen.</p>
        <Formula>{`Gauge % = Available N ÷ Target N demand × 100

Target N demand = Target yield (t/ha) × N per tonne for crop`}</Formula>
        <p className="mt-2">Target yield defaults to the D4-7 (average season) yield for the crop, or a custom value entered in paddock settings.</p>
        <Table headers={['Zone', '% of target N met', 'Meaning']} rows={[
          ['Green', '≥85%', 'On track to meet target yield'],
          ['Amber', '60-85%', 'Watch — consider topdress'],
          ['Red', '<60%', 'Needs top-up — yield will be limited'],
        ]} />
      </>
    ),
  },
  {
    id: 'mitscherlich',
    title: 'Mitscherlich Yield Response Curve',
    content: (
      <>
        <p>Predicts yield response to available nitrogen using the Mitscherlich-Baule diminishing returns model.</p>
        <Formula>{`Y = Ymax × (1 − e^(−c × (N + b)))

Y    = predicted yield (t/ha)
Ymax = maximum achievable yield for the season (t/ha)
N    = available soil N (kg/ha)
c    = efficiency coefficient (crop specific)
b    = indigenous N supply factor (set at 10)`}</Formula>
        <Table headers={['Crop', 'c coefficient']} rows={[
          ['Wheat', '0.022'],
          ['Barley', '0.020'],
          ['Canola', '0.018'],
          ['Oats', '0.020'],
        ]} />
        <p className="mt-2">Coefficients based on GRDC northern and southern region publications, validated against southern Australian field trial data.</p>
      </>
    ),
  },
  {
    id: 'sulphur',
    title: 'Sulphur Co-limitation',
    content: (
      <>
        <p>When sulphur is below the critical threshold for the soil type, the yield ceiling (Ymax) is reduced even with adequate nitrogen.</p>
        <Formula>{`S-limited Ymax = Ymax × S adjustment factor

S ≥ critical threshold  → factor 1.00 (no adjustment)
S at 80-99% of threshold → factor 0.88
S at 60-79% of threshold → factor 0.75
S below 60% of threshold → factor 0.60`}</Formula>
        <Table headers={['Soil Type', 'Critical S (KCl40, mg/kg)']} rows={[
          ['Sand', '12'],
          ['Sandy Loam', '10'],
          ['Loam', '8'],
          ['Clay Loam', '7'],
          ['Clay', '6'],
        ]} />
      </>
    ),
  },
  {
    id: 'nbalance',
    title: 'Nitrogen Balance',
    content: (
      <>
        <Formula>{`Available N = Soil N + (Applied N − Volatilization Loss) − Leaching Loss − Crop Uptake`}</Formula>
        <p className="mt-2 font-medium text-stone-300">Soil N</p>
        <p>From the most recent soil test: NO3-N + NH4-N (kg/ha, 0-60cm).</p>

        <p className="mt-3 font-medium text-stone-300">Applied N</p>
        <p>Sum of all logged fertiliser applications since planted date, minus volatilization loss (see below).</p>

        <p className="mt-3 font-medium text-stone-300">Leaching Loss</p>
        <Formula>{`Leaching Loss = Soil N × Leaching Rate (by soil type and season rainfall)`}</Formula>
        <Table headers={['Soil Type', 'Low (<150mm)', 'Moderate (150-300mm)', 'High (>300mm)']} rows={[
          ['Sand', '10%', '25%', '45%'],
          ['Sandy Loam', '8%', '20%', '35%'],
          ['Loam', '5%', '12%', '20%'],
          ['Clay Loam', '3%', '8%', '12%'],
          ['Clay', '2%', '5%', '8%'],
        ]} />

        <p className="mt-3 font-medium text-stone-300">Crop Uptake</p>
        <Formula>{`Crop Uptake = (GDD% ÷ 100) × Target Yield × N per tonne for crop`}</Formula>
        <Table headers={['Crop', 'N per tonne (kg)']} rows={[
          ['Wheat', '40'],
          ['Barley', '35'],
          ['Canola', '60'],
          ['Oats', '30'],
          ['Chickpeas / Lentils / Lupins / Faba beans / Field peas', 'N-fixing — credit applied'],
        ]} />
      </>
    ),
  },
  {
    id: 'volatilization',
    title: 'Nitrogen Volatilization',
    content: (
      <>
        <p>Surface-applied nitrogen (especially urea) can convert to ammonia gas and be lost to the atmosphere before entering the soil profile — separate from leaching.</p>
        <Formula>{`Loss % = Base Rate × Temp Factor × pH Factor × Rain Timing Factor × Method Factor × Soil Factor`}</Formula>

        <p className="mt-3 font-medium text-stone-300">Base rate by product</p>
        <Table headers={['Product', 'Base Rate']} rows={[
          ['Urea', '20%'],
          ['UAN', '15%'],
          ['Ammonium Sulfate', '8%'],
          ['DAP / MAP', '5%'],
          ['Anhydrous Ammonia', '3%'],
        ]} />

        <p className="mt-3 font-medium text-stone-300">Temperature factor (avg temp in 7 days after application)</p>
        <Table headers={['Temp', 'Factor']} rows={[
          ['<15°C', '0.5×'],
          ['15-25°C', '1.0×'],
          ['25-35°C', '1.5×'],
          ['>35°C', '2.0×'],
        ]} />

        <p className="mt-3 font-medium text-stone-300">Rain timing factor (days until first ≥5mm rain event)</p>
        <Table headers={['Days to rain', 'Factor']} rows={[
          ['≤2 days', '0.3×'],
          ['3-5 days', '0.6×'],
          ['6-7 days', '0.85×'],
          ['No rain within 7 days', '1.2×'],
        ]} />

        <p className="mt-3 font-medium text-stone-300">Method factor</p>
        <Table headers={['Method', 'Factor']} rows={[
          ['Injection / Fertigation', '0.1×'],
          ['Banded / Incorporated', '0.3-0.5×'],
          ['Broadcast', '1.0×'],
        ]} />

        <p className="mt-3 font-medium text-stone-300">pH factor</p>
        <Table headers={['pH', 'Factor']} rows={[
          ['<6.0', '0.7×'],
          ['6.0-7.5', '1.0×'],
          ['>7.5', '1.4×'],
        ]} />
      </>
    ),
  },
  {
    id: 'deltat',
    title: 'Delta T (Spray Decision Metric)',
    content: (
      <>
        <p>Delta T measures evaporation potential and is the standard spray decision metric used across Australian agriculture.</p>
        <Formula>{`Delta T = Dry Bulb Temperature − Wet Bulb Temperature

Wet bulb approximated using the Stull (2011) formula from temperature and humidity`}</Formula>
        <Table headers={['Delta T', 'Zone', 'Advice']} rows={[
          ['0-2°C', 'TOO HUMID', 'Poor drying, runoff risk — avoid spraying'],
          ['2-8°C', 'OPTIMAL', 'Best spraying conditions'],
          ['8-10°C', 'MARGINAL', 'Use coarser droplets, reduce risk'],
          ['>10°C', 'TOO DRY', 'High evaporation, drift risk — avoid'],
        ]} />
      </>
    ),
  },
  {
    id: 'spray',
    title: 'Spray Window',
    content: (
      <>
        <p>Combines wind, humidity, temperature and Delta T against crop-specific thresholds.</p>
        <Formula>{`NOT SUITABLE if:
  Wind > crop wind limit
  Humidity > crop max humidity
  Temperature outside crop's min/max range

CAUTION if:
  Humidity < crop min humidity
  Wind > 80% of crop wind limit

Otherwise: SUITABLE`}</Formula>
        <p className="mt-2">Thresholds are set per crop type and can be overridden per paddock.</p>
      </>
    ),
  },
  {
    id: 'gdd',
    title: 'GDD & Growth Stage',
    content: (
      <>
        <Formula>{`Daily GDD = MAX(0, Average Daily Temp − Base Temperature)
Accumulated GDD = SUM of daily GDD since planted date`}</Formula>
        <p className="mt-2">Growth stage is looked up from accumulated GDD against crop-specific Zadoks/BBCH thresholds. Harvest window estimate only appears once 14+ days of data have been collected, to avoid unreliable early-season extrapolation.</p>
      </>
    ),
  },
  {
    id: 'frost',
    title: 'Frost Risk',
    content: (
      <>
        <p>Based on overnight minimum temperature forecast/observed, with risk weighted by crop growth stage — flowering and grain fill are far more frost-sensitive than germination or vegetative stages.</p>
        <Table headers={['Risk Level', 'Condition']} rows={[
          ['CRITICAL', 'Below frost threshold during a frost-critical growth stage (e.g. flowering)'],
          ['HIGH', 'Below frost threshold at any stage'],
          ['MEDIUM', 'Within 2°C of frost threshold'],
        ]} />
      </>
    ),
  },
  {
    id: 'disease',
    title: 'Disease Risk',
    content: (
      <>
        <p>Calculated from temperature, humidity and leaf wetness proxy (hours of high humidity as a substitute until dedicated leaf wetness sensors are deployed).</p>
        <p className="mt-2">Covers stripe rust, stem rust, leaf rust (cereals) and sclerotinia (canola, lentils) — each with their own temperature and humidity windows based on known infection conditions.</p>
      </>
    ),
  },
  {
    id: 'drying',
    title: 'Drying Conditions',
    content: (
      <>
        <p className="font-medium text-stone-300">Grain Drying Index</p>
        <Formula>{`HIGH:     Temp >20°C AND Humidity <50%
MODERATE: Temp >15°C AND Humidity <65%
POOR:     Humidity >75% OR Temp <10°C`}</Formula>
        <p className="mt-3 font-medium text-stone-300">Field Surface Status</p>
        <p>Based on hours since last meaningful rain event (&gt;0.2mm) and current humidity — DRY / DAMP / WET.</p>
        <p className="mt-3 font-medium text-stone-300">Evaporation Rate Proxy</p>
        <Formula>{`Evap Rate ≈ (Dew Point Depression × Wind Speed ÷ 10) × 0.08`}</Formula>
      </>
    ),
  },
  {
    id: 'manualrain',
    title: 'Manual Rain Entry',
    content: (
      <>
        <p>For paddocks where the WS90 was installed mid-season, or to correct gaps in sensor data.</p>
        <Formula>{`Season Rainfall = WS90 Rainfall (since planted date) + Manual Rain Entries (since planted date)`}</Formula>
        <p className="mt-2">Entries can be a single lump-sum total or multiple dated events. Manual entries are added on top of live WS90 readings, never replacing them.</p>
      </>
    ),
  },
]

export default function MethodologyPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['gauges']))

  function toggle(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Methodology</h1>
        <p className="text-sm text-stone-500 mt-0.5">How every number on the dashboard is calculated — formulas, thresholds and data sources</p>
      </div>

      <div className="card divide-y divide-[#344a20] overflow-hidden">
        {sections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-sm font-medium text-stone-200">{section.title}</span>
              <svg
                className={`w-4 h-4 text-stone-500 transition-transform ${openSections.has(section.id) ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {openSections.has(section.id) && (
              <div className="px-4 pb-4 text-sm text-stone-400 leading-relaxed">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-stone-600 pb-4">
        All calculations are estimates based on published agronomic research (GRDC, CSIRO) and sensor data.
        Consult your agronomist before making fertiliser or management decisions.
      </div>
    </div>
  )
}
