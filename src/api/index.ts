// Runs each external service independently with a 10-second timeout (FR-11) and turns the
// outcome into a ServiceState: ok, error, timeout, or unconfigured (missing API key).
// The caller saves each result as soon as it arrives, so cards load one by one.
import type { ServiceKey, ServiceState, Trip, TripSnapshot } from '../types'
import { ConfigError } from './errors'
import { getEvents } from './events'
import { getHolidays } from './holidays'
import { getRoute } from './route'
import { getWeather } from './weather'

export const SERVICE_KEYS: ServiceKey[] = ['weather', 'events', 'holidays', 'route']
const TIMEOUT_MS = 10_000

async function run<T>(request: (signal: AbortSignal) => Promise<T>): Promise<ServiceState<T>> {
  try {
    const data = await request(AbortSignal.timeout(TIMEOUT_MS))
    return { status: 'ok', data, fetchedAt: Date.now() }
  } catch (err) {
    if (err instanceof ConfigError) return { status: 'unconfigured', error: err.message }
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return { status: 'timeout', error: 'The service didn’t respond within 10 seconds.' }
    }
    // fetch() rejects with a TypeError when offline or blocked.
    if (err instanceof TypeError) return { status: 'error', error: 'Couldn’t reach the service. Check your connection.' }
    return { status: 'error', error: err instanceof Error ? err.message : String(err) }
  }
}

type Fetched<K extends ServiceKey> = NonNullable<TripSnapshot[K]>

/** Fetch one service for a trip. Never throws; failures come back as a ServiceState. */
export function fetchService<K extends ServiceKey>(key: K, trip: Trip): Promise<Fetched<K>> {
  const { origin, destination, startDate, endDate } = trip
  const requests = {
    weather: (s: AbortSignal) => getWeather(destination, startDate, endDate, s),
    events: (s: AbortSignal) => getEvents(destination, startDate, endDate, s),
    holidays: (s: AbortSignal) => getHolidays(destination.countryCode, startDate, endDate, s),
    route: (s: AbortSignal) => getRoute(origin, destination, s),
  }
  return run(requests[key] as (s: AbortSignal) => Promise<never>) as Promise<Fetched<K>>
}
