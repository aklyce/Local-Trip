// Packing checklist rules (PRD v2 FR-15 to FR-18). Pure functions only; storage is in src/db.ts.
//
// Suggestions are rule-based:
//  - every trip: Phone charger, ID, Toiletries
//  - current forecast only (never historical data):
//      any rain probability >= 40 %  → Umbrella, Rain jacket
//      any low below 10 °C          → Warm jacket
//      any high above 28 °C         → Sunscreen, Water bottle
//  - more than three days (inclusive) → Laundry bag
//  - origin and destination countries differ → Passport, Power adapter
// Merging only ever *adds* missing suggestions, so the user's ticks, custom items and
// removals are never overwritten by a refresh (FR-17).
import type { ChecklistItem, Trip, WeatherResult } from '../types'
import { daysBetween } from './dates'

const RAIN_PROBABILITY_PCT = 40
const COLD_LOW_C = 10
const HOT_HIGH_C = 28
const LONG_TRIP_DAYS = 3

type TripBasics = Pick<Trip, 'origin' | 'destination' | 'startDate' | 'endDate'>

/** Suggested item labels for a trip, in display order. */
export function suggestLabels(trip: TripBasics, weather?: WeatherResult): string[] {
  const labels = ['Phone charger', 'ID', 'Toiletries']

  if (weather?.kind === 'forecast' && weather.days.length > 0) {
    const days = weather.days
    if (days.some((d) => d.precipitation !== null && d.precipitation >= RAIN_PROBABILITY_PCT)) {
      labels.push('Umbrella', 'Rain jacket')
    }
    if (days.some((d) => d.tempMin < COLD_LOW_C)) labels.push('Warm jacket')
    if (days.some((d) => d.tempMax > HOT_HIGH_C)) labels.push('Sunscreen', 'Water bottle')
  }

  if (daysBetween(trip.startDate, trip.endDate) + 1 > LONG_TRIP_DAYS) labels.push('Laundry bag')

  const from = trip.origin.countryCode
  const to = trip.destination.countryCode
  if (from && to && from !== to) labels.push('Passport', 'Power adapter')

  return labels
}

const key = (label: string) => label.trim().toLowerCase()

export function newItem(label: string, auto: boolean): ChecklistItem {
  return { id: crypto.randomUUID(), label: label.trim(), done: false, auto }
}

/**
 * Add suggestions that aren't on the list yet and weren't removed by the user.
 * Existing items (ticks, custom items, order) are left exactly as they are.
 */
export function mergeSuggestions(items: ChecklistItem[], suggestions: string[], dismissed: string[] = []): ChecklistItem[] {
  const present = new Set([...items.map((i) => key(i.label)), ...dismissed.map(key)])
  const added: ChecklistItem[] = []
  for (const label of suggestions) {
    if (present.has(key(label))) continue
    present.add(key(label))
    added.push(newItem(label, true))
  }
  return added.length ? [...items, ...added] : items
}

/** Is this label already on the list? (case-insensitive) */
export function hasLabel(items: ChecklistItem[], label: string): boolean {
  return items.some((i) => key(i.label) === key(label))
}

export function dismissKey(label: string): string {
  return key(label)
}

export interface Progress {
  done: number
  total: number
}

export function checklistProgress(items: ChecklistItem[] | undefined): Progress {
  const list = items ?? []
  return { done: list.filter((i) => i.done).length, total: list.length }
}

/** "7 / 12 packed", or a defined zero state for an empty list (FR-18). */
export function formatProgress({ done, total }: Progress): string {
  return total === 0 ? 'No items yet' : `${done} / ${total} packed`
}
