// Australian Bureau of Meteorology stations in Wimmera/Mallee region (Victoria)
// Data from: http://www.bom.gov.au/catalogue/data-feeds.shtml

export const BOM_STATIONS = [
  { id: 'IDV10701', name: 'Horsham Aerodrome', lat: -37.3167, lon: 142.1833 },
  { id: 'IDV10707', name: 'Nhill Aerodrome', lat: -37.3486, lon: 141.6431 },
  { id: 'IDV10710', name: 'Warracknabeal', lat: -37.2667, lon: 141.5 },
  { id: 'IDV10711', name: 'Birchip', lat: -36.75, lon: 141.8167 },
  { id: 'IDV10712', name: 'Swan Hill Aerodrome', lat: -35.3333, lon: 143.55 },
  { id: 'IDV10713', name: 'Walpeup Research Station', lat: -35.2833, lon: 141.5667 },
  { id: 'IDV10714', name: 'Kerang', lat: -35.75, lon: 142.4333 },
  { id: 'IDV10715', name: 'Hopetoun Airport', lat: -37.0167, lon: 141.1333 },
  { id: 'IDV10716', name: 'Charlton', lat: -36.25, lon: 142.2 },
  { id: 'IDV10717', name: 'Donald', lat: -36.3833, lon: 142.3833 },
  { id: 'IDV10718', name: 'Ouyen', lat: -35.3833, lon: 142.1 },
  { id: 'IDV10719', name: 'Rainbow', lat: -36.4333, lon: 141.6833 },
  { id: 'IDV10720', name: 'Sea Lake', lat: -35.7833, lon: 142.4167 },
  { id: 'IDV10721', name: 'Minyip', lat: -36.9333, lon: 141.5833 },
]

export function getBoMStationChoices() {
  return BOM_STATIONS.map(s => ({ value: s.id, label: `${s.name} (${s.id})` }))
}
