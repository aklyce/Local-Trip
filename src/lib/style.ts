import type { Place } from '../types'

/** First part of a place name: "Seattle, Washington, United States" → "Seattle". */
export function shortName(place: Place): string {
  return place.name.split(',')[0]
}

/** A stable gradient per destination, so each trip gets its own look without needing photos. */
export function placeGradient(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return `linear-gradient(135deg, hsl(${hue} 65% 32%), hsl(${(hue + 40) % 360} 70% 22%))`
}
