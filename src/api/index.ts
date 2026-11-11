import type { Section, Trip, TripSnapshot } from '../types'
import { haversineKm } from './distance'
import { getEvents } from './events'
import { getHolidays } from './holidays'
import { getWeather } from './weather'

async function section<T>(promise: Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await promise }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Fetch every dashboard section in parallel. Never throws; failures are stored per section. */
export async function fetchSnapshot(trip: Trip): Promise<TripSnapshot> {
  const { destination, startDate, endDate } = trip
  const [weather, events, holidays] = await Promise.all([
    section(getWeather(destination, startDate, endDate)),
    section(getEvents(destination, startDate, endDate)),
    section(getHolidays(destination.countryCode, startDate, endDate)),
  ])

  return {
    weather,
    events,
    holidays,
    distanceKm: haversineKm(trip.origin, destination),
    fetchedAt: Date.now(),
  }
}
