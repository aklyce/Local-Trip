import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import type { Place } from '../types'

// CircleMarkers instead of Leaflet's default pin images, which don't resolve under bundlers.
export default function TripMap({ origin, destination }: { origin: Place; destination: Place }) {
  const from: [number, number] = [origin.lat, origin.lon]
  const to: [number, number] = [destination.lat, destination.lon]

  return (
    <MapContainer
      bounds={[from, to]}
      boundsOptions={{ padding: [48, 48], maxZoom: 11 }}
      scrollWheelZoom={false}
      className="h-full min-h-80 w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={[from, to]} pathOptions={{ color: '#40557c', weight: 3, dashArray: '6 8', lineCap: 'round' }} />
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
