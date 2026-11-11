import type { Place } from '../types'

// https://photon.komoot.io — free, no key. Public instance is rate limited, so callers should debounce.
const PHOTON_URL = 'https://photon.komoot.io/api/'

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    city?: string
    state?: string
    country?: string
    countrycode?: string
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL(PHOTON_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '5')
  url.searchParams.set('lang', 'en')

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Photon error ${res.status}`)
  const json: { features: PhotonFeature[] } = await res.json()

  return json.features.map((f) => {
    const p = f.properties
    const [lon, lat] = f.geometry.coordinates
    const parts = [p.name, p.city !== p.name ? p.city : undefined, p.state, p.country]
    return {
      name: parts.filter(Boolean).join(', '),
      lat,
      lon,
      countryCode: p.countrycode?.toUpperCase(),
    }
  })
}
