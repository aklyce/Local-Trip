// Pure filtering for the Discover page, kept out of the component so it is easy to reason about.
import { haversineKm } from '../api/distance'
import { CATEGORY_LABELS, type Destination, type DestinationCategory } from '../data/destinations'
import type { Place } from '../types'

export interface DiscoverFilters {
  query: string
  /** null = All */
  category: DestinationCategory | null
  /** null = any distance */
  maxKm: number | null
}

export interface DestinationResult extends Destination {
  /** Straight-line distance from the discovery origin. */
  km: number
}

/** Distance thresholds offered in the filter (km, straight line). */
export const DISTANCE_OPTIONS = [150, 300] as const

/** Search, category and distance combine with AND (PRD VIS-5, DISC-1 to DISC-3). */
export function filterDestinations(list: Destination[], origin: Place, f: DiscoverFilters): DestinationResult[] {
  const q = f.query.trim().toLowerCase()
  return list
    .map((d) => ({ ...d, km: haversineKm(origin, d.place) }))
    .filter((d) => {
      if (f.category && d.category !== f.category) return false
      if (f.maxKm !== null && d.km >= f.maxKm) return false
      if (!q) return true
      // Search city name, region and category label, case-insensitively.
      const haystack = `${d.place.name} ${d.region} ${CATEGORY_LABELS[d.category]}`.toLowerCase()
      return haystack.includes(q)
    })
}
