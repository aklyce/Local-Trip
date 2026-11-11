// Loads a trip's external data. Each service is fetched and saved on its own, so cards fill in
// independently and one slow or failing API never holds up the others (FR-11).
// On open, only services with no cached state are fetched; cached data is shown without a
// network request (FR-10). "Refresh data" refetches everything.
import { useCallback, useEffect, useRef, useState } from 'react'
import { SERVICE_KEYS, fetchService } from '../api'
import { saveService } from '../db'
import type { ServiceKey, Trip } from '../types'

export function useTripServices(id: number, trip: Trip | null | undefined) {
  const [loading, setLoading] = useState<ReadonlySet<ServiceKey>>(new Set())

  const load = useCallback(
    async (t: Trip, keys: ServiceKey[]) => {
      setLoading((prev) => new Set([...prev, ...keys]))
      await Promise.all(
        keys.map(async (key) => {
          try {
            await saveService(id, key, await fetchService(key, t))
          } finally {
            setLoading((prev) => {
              const next = new Set(prev)
              next.delete(key)
              return next
            })
          }
        }),
      )
    },
    [id],
  )

  // On open, fetch services that have nothing to show: never fetched, or failed last time with no
  // saved data (e.g. an API key was missing and has since been added, or the network was down).
  // Services with saved data are shown from cache without a request (FR-10).
  const autoLoaded = useRef<number | null>(null)
  useEffect(() => {
    if (!trip || autoLoaded.current === id) return
    autoLoaded.current = id
    const missing = SERVICE_KEYS.filter((k) => {
      const state = trip.snapshot?.[k]
      return !state || (state.status !== 'ok' && state.data === undefined)
    })
    // Start after this render commits; load() updates the loading state as requests run.
    if (missing.length) queueMicrotask(() => void load(trip, missing))
  }, [trip, id, load])

  const refresh = useCallback(
    (keys: ServiceKey[] = SERVICE_KEYS) => {
      if (trip) void load(trip, keys)
    },
    [trip, load],
  )

  return { loading, refresh }
}
