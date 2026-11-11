// Events from the Ticketmaster Discovery API, filtered to the destination (50 km) and exact trip dates (FR-7).
// https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
// Needs VITE_TICKETMASTER_KEY in .env. Note: anything prefixed VITE_ ends up in the client bundle.
// No key → ConfigError, so the card can say "not configured" instead of showing a failure.
import type { EventItem, Place } from '../types'
import { addDays } from '../lib/dates'
import { ConfigError } from './errors'
const DISCOVERY_URL = 'https://app.ticketmaster.com/discovery/v2/events.json'
/** Fetch extra to leave room after dropping events outside the local trip dates. */
const FETCH_SIZE = 60
const MAX_EVENTS = 20

interface TmEvent {
  id: string
  name: string
  url: string
  dates: { start: { localDate: string; localTime?: string } }
  images?: { url: string; ratio?: string; width: number }[]
  classifications?: { segment?: { name?: string } }[]
  _embedded?: { venues?: { name?: string }[] }
}

/** Prefer a 16:9 image around card size; Ticketmaster returns many sizes. */
function pickImage(images: TmEvent['images']): string | undefined {
  if (!images?.length) return undefined
  const wide = images.filter((i) => i.ratio === '16_9').sort((a, b) => a.width - b.width)
  return (wide.find((i) => i.width >= 500) ?? wide.at(-1) ?? images[0]).url
}

export async function getEvents(place: Place, startDate: string, endDate: string, signal?: AbortSignal): Promise<EventItem[]> {
  const apiKey = import.meta.env.VITE_TICKETMASTER_KEY
  if (!apiKey) throw new ConfigError('Event listings need a Ticketmaster API key (VITE_TICKETMASTER_KEY in .env).')

  const url = new URL(DISCOVERY_URL)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('latlong', `${place.lat},${place.lon}`)
  url.searchParams.set('radius', '50')
  url.searchParams.set('unit', 'km')
  // Ticketmaster filters in UTC, but trip dates are local to the destination. Ask for one extra
  // day on each side, then keep only events whose *local* date falls inside the trip (FR-7).
  url.searchParams.set('startDateTime', `${addDays(startDate, -1)}T00:00:00Z`)
  url.searchParams.set('endDateTime', `${addDays(endDate, 1)}T23:59:59Z`)
  url.searchParams.set('sort', 'date,asc')
  url.searchParams.set('size', String(FETCH_SIZE))

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Ticketmaster error ${res.status}`)
  const json: { _embedded?: { events: TmEvent[] } } = await res.json()

  return (json._embedded?.events ?? [])
    .filter((e) => e.dates.start.localDate >= startDate && e.dates.start.localDate <= endDate)
    .slice(0, MAX_EVENTS)
    .map((e) => ({
      id: e.id,
      name: e.name,
      url: e.url,
      date: e.dates.start.localDate,
      time: e.dates.start.localTime?.slice(0, 5),
      venue: e._embedded?.venues?.[0]?.name,
      image: pickImage(e.images),
      category: segmentName(e.classifications?.[0]?.segment?.name),
    }))
}

/** Ticketmaster uses the literal "Undefined" for events without a category; hide it. */
function segmentName(name: string | undefined): string | undefined {
  return name && name !== 'Undefined' ? name : undefined
}
