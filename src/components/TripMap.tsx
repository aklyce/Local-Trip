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

// Colours match the app: cobalt route and destination, orange origin (Tailwind blue-600 / orange-500;
// Leaflet draws on SVG/canvas, so it needs literal values, not CSS classes).
const COBALT = '#155dfc'
const ORANGE = '#ff6900'
const INK = '#0a0a0a'

// CircleMarkers instead of Leaflet's default pin images, which don't resolve under bundlers.
// The OpenStreetMap tiles are muted to grey in index.css (.trip-map) so the route stands out.
export default function TripMap({ origin, destination, road }: Props) {
  const from: [number, number] = [origin.lat, origin.lon]
  const to: [number, number] = [destination.lat, destination.lon]

  return (
    <MapContainer
      bounds={[from, to, ...(road ?? [])]}
      boundsOptions={{ padding: [48, 48], maxZoom: 11 }}
      scrollWheelZoom={false}
      className="trip-map isolate h-full min-h-80 w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={[from, to]} pathOptions={{ color: INK, weight: 2, opacity: 0.55, dashArray: '2 8', lineCap: 'round' }} />
      {/* White casing under the road so it reads on any tile. */}
      {road && <Polyline positions={road} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />}
      {road && <Polyline positions={road} pathOptions={{ color: COBALT, weight: 4, lineCap: 'round', lineJoin: 'round' }} />}
      <CircleMarker center={from} radius={8} pathOptions={{ color: '#ffffff', weight: 3, fillColor: ORANGE, fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]} permanent>
          {origin.name.split(',')[0]}
        </Tooltip>
      </CircleMarker>
      <CircleMarker center={to} radius={10} pathOptions={{ color: '#ffffff', weight: 3, fillColor: COBALT, fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -10]} permanent className="trip-map-destination">
          {destination.name.split(',')[0]}
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}

/** Small key under the map so the lines and pins can't be confused. */
export function MapLegend({ hasRoad }: { hasRoad: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-body-regular text-text-secondary">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-orange-500" /> Start
      </span>
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-accent-600" /> Destination
      </span>
      {hasRoad && (
        <span className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-accent-600" /> Driving route
        </span>
      )}
      <span className="flex items-center gap-2">
        <span className="w-6 border-t-2 border-dotted border-text-primary/60" /> Straight line
      </span>
    </div>
  )
}
