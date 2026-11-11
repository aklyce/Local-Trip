import Dexie, { type EntityTable } from 'dexie'
import type { Trip } from './types'

// Trips live in the browser's IndexedDB, so history is per-browser and needs no backend.
export const db = new Dexie('LocalTrip') as Dexie & {
  trips: EntityTable<Trip, 'id'>
}

// Only indexed fields go in the schema; everything else is stored as-is.
db.version(1).stores({
  trips: '++id, createdAt',
})
