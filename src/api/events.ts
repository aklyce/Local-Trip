import type { EventItem, Place } from '../types'

// https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
// Needs VITE_TICKETMASTER_KEY in .env. Note: anything prefixed VITE_ ends up in the client bundle.
const DISCOVERY_URL = 'https://app.ticketmaster.com/discovery/v2/events.json'

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

export async function getEvents(place: Place, startDate: string, endDate: string): Promise<EventItem[]> {
  const apiKey = import.meta.env.VITE_TICKETMASTER_KEY
  if (!apiKey) throw new Error('Missing VITE_TICKETMASTER_KEY (see .env.example)')

  const url = new URL(DISCOVERY_URL)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('latlong', `${place.lat},${place.lon}`)
  url.searchParams.set('radius', '50')
  url.searchParams.set('unit', 'km')
  url.searchParams.set('startDateTime', `${startDate}T00:00:00Z`)
  url.searchParams.set('endDateTime', `${endDate}T23:59:59Z`)
  url.searchParams.set('sort', 'date,asc')
  url.searchParams.set('size', '20')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Ticketmaster error ${res.status}`)
  const json: { _embedded?: { events: TmEvent[] } } = await res.json()

  return (json._embedded?.events ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    url: e.url,
    date: e.dates.start.localDate,
    time: e.dates.start.localTime?.slice(0, 5),
    venue: e._embedded?.venues?.[0]?.name,
    image: pickImage(e.images),
    category: e.classifications?.[0]?.segment?.name,
  }))
}
