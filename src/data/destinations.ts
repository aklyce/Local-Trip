// Curated Discover destinations (PRD v2 §4, DISC-1 to DISC-5).
// This is hand-picked inspiration, not a live place database: six California trips
// measured from a fixed Berkeley origin. Photos go in public/images/<id>.jpg; a card
// falls back to a gradient when a photo is missing, so the page works without them.
import type { Place } from '../types'

export type DestinationCategory = 'city' | 'water' | 'outdoors'

export const CATEGORY_LABELS: Record<DestinationCategory, string> = {
  city: 'City breaks',
  water: 'By the water',
  outdoors: 'Outdoors',
}

export interface Destination {
  /** Stable slug, also the photo file name. */
  id: string
  place: Place
  /** Shown above the city name, e.g. "California". */
  region: string
  /** One primary category per city (not an exhaustive description). */
  category: DestinationCategory
  blurb: string
  /** Path relative to the site root, e.g. "images/monterey.jpg". */
  image?: string
  imageAlt: string
}

/** Discovery origin. Fixed for v2 (DISC-3); never replaced by a trip-form origin. */
export const DISCOVER_ORIGIN: Place = {
  name: 'Berkeley, California, United States',
  lat: 37.8715,
  lon: -122.273,
  countryCode: 'US',
  region: 'California',
}

function place(name: string, lat: number, lon: number, region: string): Place {
  return { name, lat, lon, countryCode: 'US', region }
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'san-francisco',
    place: place('San Francisco, California, United States', 37.7749, -122.4194, 'California'),
    region: 'California',
    category: 'city',
    blurb: 'Foggy mornings. Neighborhood wandering. A change of pace.',
    image: 'images/san-francisco.jpg',
    imageAlt: 'The Golden Gate Bridge in San Francisco',
  },
  {
    id: 'monterey',
    place: place('Monterey, California, United States', 36.6002, -121.8947, 'California'),
    region: 'California',
    category: 'water',
    blurb: 'Coastal trails, sea air, and absolutely no rush.',
    image: 'images/monterey.jpg',
    imageAlt: 'Waves on the rocky Monterey coastline',
  },
  {
    id: 'yosemite',
    place: place('Yosemite Valley, California, United States', 37.7456, -119.5936, 'California'),
    region: 'California',
    category: 'outdoors',
    blurb: 'Big granite views and a little room to breathe.',
    image: 'images/yosemite.jpg',
    imageAlt: 'Granite cliffs and pine forest in Yosemite',
  },
  {
    id: 'los-angeles',
    place: place('Los Angeles, California, United States', 34.0522, -118.2437, 'California'),
    region: 'California',
    category: 'city',
    blurb: 'Art, good food, and a different kind of golden hour.',
    image: 'images/los-angeles.jpg',
    imageAlt: 'Los Angeles skyline at sunset',
  },
  {
    id: 'tahoe',
    place: place('Lake Tahoe, California, United States', 39.0968, -120.0324, 'California / Nevada'),
    region: 'California / Nevada',
    category: 'outdoors',
    blurb: 'Alpine air and a lake you could look at all day.',
    image: 'images/tahoe.jpg',
    imageAlt: 'Lake Tahoe surrounded by mountains',
  },
  {
    id: 'santa-cruz',
    place: place('Santa Cruz, California, United States', 36.9741, -122.0308, 'California'),
    region: 'California',
    category: 'water',
    blurb: 'A boardwalk afternoon with an ocean-side finish.',
    image: 'images/santa-cruz.jpg',
    imageAlt: 'Beach and ocean in Santa Cruz',
  },
]

/** Places offered by city search when Photon is unreachable (FR-1 outage fallback). */
export const CURATED_PLACES: Place[] = [DISCOVER_ORIGIN, ...DESTINATIONS.map((d) => d.place)]
