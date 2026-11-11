// Browser persistence (Dexie over IndexedDB). Trips are per-browser; there is no backend.
// Every write re-reads the trip inside a transaction, so a slow API response can never
// overwrite checklist edits made while it was loading (FR-17).
import Dexie, { type EntityTable } from 'dexie'
import { mergeSuggestions, suggestLabels } from './lib/checklist'
import type { ServiceKey, ServiceState, Trip, TripSnapshot } from './types'

export const db = new Dexie('LocalTrip') as Dexie & {
  trips: EntityTable<Trip, 'id'>
}

// Only indexed fields go in the schema; everything else is stored as-is.
db.version(1).stores({
  trips: '++id, createdAt',
})

/** Snapshot shape used by schema v1/v2: one shared timestamp, `{ ok, data | error }` per section. */
type LegacySection<T> = { ok: true; data: T } | { ok: false; error: string }
interface LegacySnapshot {
  weather?: LegacySection<unknown>
  events?: LegacySection<unknown>
  holidays?: LegacySection<unknown>
  fetchedAt?: number
}

// v2: trips gain a packing checklist, seeded from cached weather if any.
db.version(2)
  .stores({ trips: '++id, createdAt' })
  .upgrade((tx) =>
    tx
      .table('trips')
      .toCollection()
      .modify((trip: Trip & { snapshot?: LegacySnapshot }) => {
        if (trip.checklist) return
        const w = trip.snapshot?.weather
        const weather = w?.ok ? (w.data as Parameters<typeof suggestLabels>[1]) : undefined
        trip.checklist = mergeSuggestions([], suggestLabels(trip, weather))
      }),
  )

// v3: snapshot becomes per-service ServiceState with its own timestamp (FR-10).
db.version(3)
  .stores({ trips: '++id, createdAt' })
  .upgrade((tx) =>
    tx
      .table('trips')
      .toCollection()
      .modify((trip: { snapshot?: LegacySnapshot | TripSnapshot }) => {
        const old = trip.snapshot as LegacySnapshot | undefined
        if (!old || old.fetchedAt === undefined) return
        const convert = (s?: LegacySection<unknown>): ServiceState<unknown> | undefined =>
          !s ? undefined : s.ok ? { status: 'ok', data: s.data, fetchedAt: old.fetchedAt } : { status: 'error', error: s.error }
        trip.snapshot = {
          weather: convert(old.weather),
          events: convert(old.events),
          holidays: convert(old.holidays),
        } as TripSnapshot
      }),
  )

/**
 * Save one service's result. A failed attempt keeps the previous successful data (now stale).
 * A successful weather result also adds any new weather-based checklist suggestions.
 */
export async function saveService<K extends ServiceKey>(id: number, key: K, result: NonNullable<TripSnapshot[K]>): Promise<void> {
  await db.transaction('rw', db.trips, async () => {
    const trip = await db.trips.get(id)
    if (!trip) return
    const prev = trip.snapshot?.[key]
    const next = result.status === 'ok' ? result : { ...result, data: prev?.data, fetchedAt: prev?.fetchedAt }
    const snapshot = { ...trip.snapshot, [key]: next } as TripSnapshot

    const changes: Partial<Trip> = { snapshot }
    if (key === 'weather' && result.status === 'ok') {
      const weather = (result as NonNullable<TripSnapshot['weather']>).data
      changes.checklist = mergeSuggestions(trip.checklist ?? [], suggestLabels(trip, weather), trip.dismissedSuggestions)
    }
    await db.trips.update(id, changes)
  })
}

/** Apply a change to the latest stored copy of the trip. Throws if storage fails. */
export async function editTrip(id: number, change: (trip: Trip) => Partial<Trip>): Promise<void> {
  await db.transaction('rw', db.trips, async () => {
    const trip = await db.trips.get(id)
    if (!trip) throw new Error('This trip no longer exists.')
    await db.trips.update(id, change(trip))
  })
}
