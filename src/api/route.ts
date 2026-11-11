// Driving route from the public OSRM demo server (FR-12). Free, no key, fair-use only.
// https://project-osrm.org/docs/v5.24.0/api/#route-service
// Returns road distance/time and a simplified line for the map, or { kind: 'none' } when
// OSRM finds no road connection (e.g. across an ocean) or had to snap a city far away to fake one.
import type { Place, RouteResult } from '../types'

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

interface OsrmResponse {
  code: string
  message?: string
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[]
  /** `distance` = metres between the requested point and the road OSRM snapped it to. */
  waypoints?: { distance: number }[]
}

/**
 * If a point had to be moved further than this to reach the road network, the "route" isn't real.
 * (OSRM snaps to whichever network it can connect, e.g. Berkeley → Paris snaps Berkeley to Portugal.)
 */
const MAX_SNAP_M = 25_000

export async function getRoute(origin: Place, destination: Place, signal?: AbortSignal): Promise<RouteResult> {
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`
  const url = new URL(`${OSRM_URL}/${coords}`)
  url.searchParams.set('overview', 'simplified')
  url.searchParams.set('geometries', 'geojson')

  const res = await fetch(url, { signal })
  // OSRM answers "no route" with HTTP 400 and a JSON code, so read the body before checking status.
  const json: OsrmResponse = await res.json().catch(() => ({ code: 'BadResponse' }))
  if (json.code === 'NoRoute') return { kind: 'none' }
  if (!res.ok || json.code !== 'Ok' || !json.routes?.length) {
    throw new Error(json.message ?? `OSRM error ${res.status}`)
  }

  if (json.waypoints?.some((w) => w.distance > MAX_SNAP_M)) return { kind: 'none' }

  const route = json.routes[0]
  return {
    kind: 'route',
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
    geometry: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
  }
}
