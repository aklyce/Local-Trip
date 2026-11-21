// Events from the Ticketmaster Discovery API, filtered to the destination (50 km) and exact trip dates (FR-7).
// https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
// Needs VITE_TICKETMASTER_KEY in .env. Note: anything prefixed VITE_ ends up in the client bundle.
// No key → ConfigError, so the card can say "not configured" instead of showing a failure.
import type { EventItem, Place } from '../types'
import { ConfigError } from './errors'
const DISCOVERY_URL = 'https://app.ticketmaster.com/discovery/v2/events.json'
/** Fetch a pool of the most relevant events, keep the top MAX_EVENTS, then show them by date. */
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
  // Filter on the venue's *local* date/time, so trip dates match without timezone padding (FR-7).
  url.searchParams.set('localStartDateTime', `${startDate}T00:00:00,${endDate}T23:59:59`)
  // Relevance, not date: sorting by date filled the whole page with the first day's events in big
  // cities (LA showed none at all when padded days were included). Relevance spreads the results
  // across the trip and surfaces headline events; we re-sort by date below for display.
  url.searchParams.set('sort', 'relevance,desc')
  url.searchParams.set('size', String(FETCH_SIZE))

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Ticketmaster error ${res.status}`)
  const json: { _embedded?: { events: TmEvent[] } } = await res.json()

  const seen = new Set<string>()
  return (json._embedded?.events ?? [])
    // Safety net: keep only events whose local date is inside the trip.
    .filter((e) => e.dates.start.localDate >= startDate && e.dates.start.localDate <= endDate)
    // Same show at the same time is sometimes listed twice (e.g. ticket + package); keep one.
    .filter((e) => {
      const key = `${e.name}|${e.dates.start.localDate}|${e.dates.start.localTime ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, MAX_EVENTS)
    .sort((a, b) =>
      `${a.dates.start.localDate} ${a.dates.start.localTime ?? ''}`.localeCompare(`${b.dates.start.localDate} ${b.dates.start.localTime ?? ''}`),
    )
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
