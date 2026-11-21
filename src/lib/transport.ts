// Transport helpers (FR-12 to FR-14): unit formatting, the flight estimate constants and the
// external search links. Kept separate from the card so they are easy to check on their own.
import type { Trip } from '../types'
import { shortName } from './style'

// Distances are stored and computed in km (APIs use km) and shown in miles first.
export const KM_PER_MILE = 1.609344
export const FLIGHT_KMH = 800
export const AIRPORT_OVERHEAD_H = 2
export const LONG_DRIVE_MIN = 8 * 60
// Below about 200 mi (320 km) straight-line, airport time alone outweighs the drive, so we
// don't offer a flight estimate at all.
export const SHORT_HOP_KM = 320

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export const km = (n: number) => `${Math.round(n).toLocaleString()} km`
export const mi = (n: number) => `${Math.round(n / KM_PER_MILE).toLocaleString()} mi`

// Temperatures are stored in °C (Open-Meteo default, and the checklist rules use °C) and shown in °F.
export const toF = (c: number) => (c * 9) / 5 + 32
// Historical precipitation is stored in mm and shown in inches.
export const mmToIn = (mm: number) => mm / 25.4

export function googleFlightsUrl(trip: Trip): string {
  const q = `Flights from ${shortName(trip.origin)} to ${shortName(trip.destination)} on ${trip.startDate} through ${trip.endDate}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function rome2rioUrl(trip: Trip): string {
  const slug = (name: string) => encodeURIComponent(name.trim().replace(/\s+/g, '-'))
  return `https://www.rome2rio.com/map/${slug(shortName(trip.origin))}/${slug(shortName(trip.destination))}`
}
