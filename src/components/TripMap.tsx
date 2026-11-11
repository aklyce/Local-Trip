// Map with origin and destination markers (FR-9). The dashed line is the straight-line
// distance; when OSRM found a driving route, the road is drawn as a solid line on top.
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import type { Place } from '../types'

interface Props {
  origin: Place
  destination: Place
  /** Road geometry as [lat, lon] pairs, if a driving route exists. */
  road?: [number, number][]
}

// CircleMarkers instead of Leaflet's default pin images, which don't resolve under bundlers.
export default function TripMap({ origin, destination, road }: Props) {
  const from: [number, number] = [origin.lat, origin.lon]
  const to: [number, number] = [destination.lat, destination.lon]

  return (
    <MapContainer
      bounds={[from, to, ...(road ?? [])]}
      boundsOptions={{ padding: [48, 48], maxZoom: 11 }}
      scrollWheelZoom={false}
      className="h-full min-h-80 w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={[from, to]} pathOptions={{ color: '#5f6b80', weight: 2, dashArray: '6 8', lineCap: 'round' }} />
      {road && <Polyline positions={road} pathOptions={{ color: '#40557c', weight: 4, opacity: 0.85 }} />}
      <CircleMarker center={from} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#5f6b80', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -6]}>From: {origin.name}</Tooltip>
      </CircleMarker>
      <CircleMarker center={to} radius={9} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#40557c', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]} permanent>
          {destination.name.split(',')[0]}
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}

/** Small key under the map so the two lines can't be confused. */
export function MapLegend({ hasRoad }: { hasRoad: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
      {hasRoad && (
        <span className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-accent" /> Driving route
        </span>
      )}
      <span className="flex items-center gap-2">
        <span className="w-6 border-t-2 border-dashed border-ink-muted" /> Straight line
      </span>
    </div>
  )
}
