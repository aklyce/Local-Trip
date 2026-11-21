import type { Place } from '../types'

/** First part of a place name: "Seattle, Washington, United States" → "Seattle". */
export function shortName(place: Place): string {
  return place.name.split(',')[0]
}

/** Solid colour fields behind the contour art: one per Discover category, cobalt for saved trips. */
export const FIELD = {
  city: 'bg-orange-500 text-orange-950',
  water: 'bg-cyan-500 text-cyan-950',
  outdoors: 'bg-emerald-500 text-emerald-950',
  trip: 'bg-accent-600 text-white',
} as const
