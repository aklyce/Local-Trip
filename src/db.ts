// Browser persistence (Dexie over IndexedDB). Trips are per-browser; there is no backend.
// Every write that touches a trip's checklist re-reads the trip inside a transaction, so a
// slow API refresh can never overwrite checklist edits made while it was loading (FR-17).
import Dexie, { type EntityTable } from 'dexie'
import { mergeSuggestions, suggestLabels } from './lib/checklist'
import type { Trip, TripSnapshot } from './types'

export const db = new Dexie('LocalTrip') as Dexie & {
  trips: EntityTable<Trip, 'id'>
}

// Only indexed fields go in the schema; everything else is stored as-is.
db.version(1).stores({
  trips: '++id, createdAt',
})

// v2: trips gain a packing checklist. Indexes are unchanged; the upgrade gives every
// existing trip its suggested items (using its cached weather, if any).
db.version(2)
  .stores({ trips: '++id, createdAt' })
  .upgrade((tx) =>
    tx
      .table<Trip, number>('trips')
      .toCollection()
      .modify((trip) => {
        if (trip.checklist) return
        const weather = trip.snapshot?.weather.ok ? trip.snapshot.weather.data : undefined
        trip.checklist = mergeSuggestions([], suggestLabels(trip, weather))
      }),
  )

/**
 * Store freshly fetched API data and add any new weather-based suggestions.
 * Reads the latest trip in the same transaction so concurrent checklist edits are kept.
 */
export async function saveSnapshot(id: number, snapshot: TripSnapshot): Promise<void> {
  await db.transaction('rw', db.trips, async () => {
    const trip = await db.trips.get(id)
    if (!trip) return
    const weather = snapshot.weather.ok ? snapshot.weather.data : undefined
    const checklist = mergeSuggestions(trip.checklist ?? [], suggestLabels(trip, weather), trip.dismissedSuggestions)
    await db.trips.update(id, { snapshot, checklist })
  })
}

/** Apply a checklist change to the latest stored copy of the trip. Throws if storage fails. */
export async function editTrip(id: number, change: (trip: Trip) => Partial<Trip>): Promise<void> {
  await db.transaction('rw', db.trips, async () => {
    const trip = await db.trips.get(id)
    if (!trip) throw new Error('This trip no longer exists.')
    await db.trips.update(id, change(trip))
  })
}
