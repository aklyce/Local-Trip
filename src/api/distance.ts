import type { Place } from '../types'

const EARTH_RADIUS_KM = 6371

/** Straight-line (great-circle) distance. TODO: driving distance/time via OSRM. */
export function haversineKm(a: Place, b: Place): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}
