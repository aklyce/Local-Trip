// Background cloud sync between local IndexedDB (db.trips) and Supabase.
// Uses Dexie table hooks so existing pages (PlanTripDialog, TripPage, HistoryPage)
// require zero changes. Every Supabase call is wrapped in try/catch so local
// persistence never fails even if the network or Supabase is down.
import { db } from '../db'
import type { Trip } from '../types'
import { supabase } from './supabase'

let activeUserId: string | null = null
let isSyncingFromCloud = false
let hooksRegistered = false

function sanitizeTrip(trip: Trip, id: number): Trip {
  return { ...trip, id }
}

async function upsertRemote(userId: string, localId: number, trip: Trip): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.from('trips').upsert(
      {
        user_id: userId,
        local_id: localId,
        trip_data: sanitizeTrip(trip, localId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,local_id' },
    )
    if (error) console.warn('[cloudSync] upsert failed:', error.message)
  } catch (err) {
    console.warn('[cloudSync] upsert error:', err)
  }
}

async function deleteRemote(userId: string, localId: number): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.from('trips').delete().eq('user_id', userId).eq('local_id', localId)
    if (error) console.warn('[cloudSync] delete failed:', error.message)
  } catch (err) {
    console.warn('[cloudSync] delete error:', err)
  }
}

/** Register Dexie hooks once so local creates/updates/deletes mirror to Supabase. */
export function registerCloudSyncHooks(): void {
  if (hooksRegistered || !supabase) return
  hooksRegistered = true

  db.trips.hook('creating', function (_primKey, obj) {
    if (isSyncingFromCloud || !activeUserId) return
    const userId = activeUserId
    const snapshot = { ...obj }
    this.onsuccess = (assignedKey) => {
      if (typeof assignedKey === 'number') {
        void upsertRemote(userId, assignedKey, snapshot)
      }
    }
  })

  db.trips.hook('updating', function (modifications, primKey, obj) {
    if (isSyncingFromCloud || !activeUserId || typeof primKey !== 'number') return
    const userId = activeUserId
    const updated = { ...obj, ...modifications } as Trip
    this.onsuccess = () => {
      void upsertRemote(userId, primKey, updated)
    }
  })

  db.trips.hook('deleting', function (primKey) {
    if (isSyncingFromCloud || !activeUserId || typeof primKey !== 'number') return
    const userId = activeUserId
    this.onsuccess = () => {
      void deleteRemote(userId, primKey)
    }
  })
}

/**
 * Load the signed-in user's trips from Supabase into local IndexedDB.
 * If the user has no cloud trips yet, uploads any existing local trips to seed their account.
 */
export async function syncOnSignIn(userId: string): Promise<void> {
  if (!supabase) return
  registerCloudSyncHooks()
  activeUserId = userId

  try {
    const { data, error } = await supabase
      .from('trips')
      .select('local_id, trip_data')
      .eq('user_id', userId)
      .order('local_id', { ascending: true })

    if (error) {
      console.warn('[cloudSync] load failed:', error.message)
      return
    }
    if (!data) return

    if (data.length > 0) {
      const cloudTrips: Trip[] = data.map((row) => ({
        ...(row.trip_data as Trip),
        id: row.local_id as number,
      }))
      isSyncingFromCloud = true
      try {
        await db.transaction('rw', db.trips, async () => {
          await db.trips.clear()
          await db.trips.bulkPut(cloudTrips)
        })
      } finally {
        isSyncingFromCloud = false
      }
    } else {
      // Brand-new account: preserve any existing local trips into their cloud wishlist.
      const localTrips = await db.trips.toArray()
      for (const trip of localTrips) {
        if (typeof trip.id === 'number') {
          await upsertRemote(userId, trip.id, trip)
        }
      }
    }
  } catch {
    // Keep local trips untouched if cloud fetch fails.
  }
}

/** Clear local synced trips on sign-out so the next user only sees their own My Trips. */
export async function clearOnSignOut(): Promise<void> {
  activeUserId = null
  isSyncingFromCloud = true
  try {
    await db.trips.clear()
  } catch {
    // Ignore storage errors on sign-out.
  } finally {
    isSyncingFromCloud = false
  }
}
