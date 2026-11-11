// City search for the plan dialog (FR-1).
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

  const places = json.features.map((f) => {
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
  // Photon sometimes returns the same place twice (e.g. a city node and its boundary); keep one.
  const seen = new Set<string>()
  return places.filter((pl) => {
    const key = `${pl.name}|${pl.lat.toFixed(3)},${pl.lon.toFixed(3)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
