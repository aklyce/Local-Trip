// Transport helpers (FR-12 to FR-14): unit formatting, the flight estimate constants and the
// external search links. Kept separate from the card so they are easy to check on their own.
import type { Trip } from '../types'
import { shortName } from './style'

export const KM_PER_MILE = 1.609344
export const FLIGHT_KMH = 800
export const AIRPORT_OVERHEAD_H = 2
export const LONG_DRIVE_MIN = 8 * 60

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export const km = (n: number) => `${Math.round(n).toLocaleString()} km`
export const mi = (n: number) => `${Math.round(n / KM_PER_MILE).toLocaleString()} mi`

export function googleFlightsUrl(trip: Trip): string {
  const q = `Flights from ${shortName(trip.origin)} to ${shortName(trip.destination)} on ${trip.startDate} through ${trip.endDate}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function rome2rioUrl(trip: Trip): string {
  const slug = (name: string) => encodeURIComponent(name.trim().replace(/\s+/g, '-'))
  return `https://www.rome2rio.com/map/${slug(shortName(trip.origin))}/${slug(shortName(trip.destination))}`
}
