// Isolated homepage notification banner:
// 1) Checks upcoming saved trips for live weather shifts or newly added events.
// 2) Falls back to a real-data digest of your saved upcoming trips (weather, events, packing progress).
// 3) Re-appears on every login and re-checks every 10 minutes.
// Wrapped in try/catch so offline/API failures never affect DiscoverPage.
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Bell, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'
import { getWeather } from '../api/weather'
import { db } from '../db'
import { checklistProgress, formatProgress } from '../lib/checklist'
import { daysBetween, today } from '../lib/dates'
import { shortName } from '../lib/style'
import type { Trip } from '../types'
import { useAuth } from './authContext'

interface TripAlert {
  tripId: number
  destination: string
  messages: string[]
  isChange: boolean
}

const CHECK_INTERVAL_MS = 10 * 60 * 1000
const TIMEOUT_MS = 8_000

function buildDigest(trip: Trip): TripAlert | null {
  if (trip.id === undefined) return null
  const parts: string[] = []
  const until = daysBetween(today(), trip.startDate)
  if (until > 1) parts.push(`Starts in ${until} days`)
  else if (until === 1) parts.push('Starts tomorrow')
  else if (until === 0) parts.push('Starts today')
  else parts.push('Happening now')

  const weather = trip.snapshot?.weather?.data
  if (weather?.days.length) {
    const highF = Math.round((Math.max(...weather.days.map((d) => d.tempMax)) * 9) / 5 + 32)
    parts.push(`High ${highF}°F`)
  }

  const events = trip.snapshot?.events?.data
  if (events && events.length > 0) {
    parts.push(`${events.length} ${events.length === 1 ? 'event' : 'events'}`)
  }

  const holidays = trip.snapshot?.holidays?.data
  if (holidays && holidays.length > 0) {
    parts.push(`${holidays.length} ${holidays.length === 1 ? 'holiday' : 'holidays'}`)
  }

  parts.push(formatProgress(checklistProgress(trip.checklist)))

  return {
    tripId: trip.id,
    destination: shortName(trip.destination),
    messages: [parts.join(' · ')],
    isChange: false,
  }
}

async function checkTripUpdates(trip: Trip): Promise<TripAlert | null> {
  if (trip.id === undefined) return null
  const messages: string[] = []
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  const prevWeather = trip.snapshot?.weather?.data
  if (prevWeather?.kind === 'forecast' && prevWeather.days.length > 0) {
    try {
      const next = await getWeather(trip.destination, trip.startDate, trip.endDate, signal)
      if (next.kind === 'forecast' && next.days.length > 0) {
        const prevMaxRain = Math.max(...prevWeather.days.map((d) => d.precipitation ?? 0))
        const nextMaxRain = Math.max(...next.days.map((d) => d.precipitation ?? 0))
        if (Math.abs(nextMaxRain - prevMaxRain) >= 15) {
          messages.push(`Rain chance shifted (${Math.round(prevMaxRain)}% → ${Math.round(nextMaxRain)}%)`)
        }
        const prevHigh = Math.max(...prevWeather.days.map((d) => d.tempMax))
        const nextHigh = Math.max(...next.days.map((d) => d.tempMax))
        if (Math.abs(nextHigh - prevHigh) >= 3) {
          messages.push(`Forecast high changed (${Math.round((prevHigh * 9) / 5 + 32)}°F → ${Math.round((nextHigh * 9) / 5 + 32)}°F)`)
        }
      }
    } catch {
      // Ignore weather check failures silently.
    }
  }

  const prevEvents = trip.snapshot?.events?.data
  if (prevEvents && import.meta.env.VITE_TICKETMASTER_KEY) {
    try {
      const nextEvents = await getEvents(trip.destination, trip.startDate, trip.endDate, signal)
      const prevIds = new Set(prevEvents.map((e) => e.id))
      const added = nextEvents.filter((e) => !prevIds.has(e.id))
      if (added.length > 0) {
        messages.push(`${added.length} new ${added.length === 1 ? 'event' : 'events'} added`)
      }
    } catch {
      // Ignore event check failures silently.
    }
  }

  if (messages.length > 0) {
    return { tripId: trip.id, destination: shortName(trip.destination), messages, isChange: true }
  }
  return buildDigest(trip)
}

export default function TripUpdatesBanner() {
  const { user } = useAuth()
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').reverse().toArray(), [])
  const [alerts, setAlerts] = useState<TripAlert[]>([])
  const [dismissedForKey, setDismissedForKey] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const bannerKey = `${user?.id ?? 'guest'}_${tick}`

  // Re-check and re-show every 10 minutes.
  useEffect(() => {
    const id = window.setInterval(() => {
      setDismissedForKey(null)
      setTick((n) => n + 1)
    }, CHECK_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!trips || trips.length === 0) return
    const now = today()
    const upcoming = trips.filter((t) => t.endDate >= now).slice(0, 3)
    if (upcoming.length === 0) return

    const cacheKey = `lt_updates_${user?.id ?? 'guest'}_${upcoming.map((t) => t.id).join('_')}`
    let live = true

    if (tick === 0) {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached) as { at: number; alerts: TripAlert[] }
          if (Date.now() - parsed.at < CHECK_INTERVAL_MS) {
            queueMicrotask(() => {
              if (live) setAlerts(parsed.alerts)
            })
            return () => {
              live = false
            }
          }
        }
      } catch {
        // Ignore sessionStorage errors.
      }
    }

    void Promise.all(upcoming.map(checkTripUpdates)).then((res) => {
      if (!live) return
      const found = res.filter((a): a is TripAlert => a !== null)
      setAlerts(found)
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), alerts: found }))
      } catch {
        // Ignore storage quota errors.
      }
    })

    return () => {
      live = false
    }
  }, [trips, user?.id, tick])

  const upcomingCount = trips ? trips.filter((t) => t.endDate >= today()).length : 0
  if (dismissedForKey === bannerKey || upcomingCount === 0 || alerts.length === 0) return null

  const hasLiveChanges = alerts.some((a) => a.isChange)

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-8 flex items-start justify-between gap-4 rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3.5 text-text-primary shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white">
          <Bell className="size-4" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-body-semibold text-text-primary">
            {hasLiveChanges
              ? 'Updates for your saved trips'
              : `You have ${upcomingCount} upcoming ${upcomingCount === 1 ? 'trip' : 'trips'} saved — take a look`}
          </p>
          <ul className="space-y-1 text-body-regular text-text-secondary">
            {alerts.map((a) => (
              <li key={a.tripId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  <strong className="font-medium text-text-primary">{a.destination}:</strong> {a.messages.join(' · ')}
                </span>
                <Link
                  to={`/trip/${a.tripId}`}
                  className="inline-flex items-center gap-1 font-medium text-accent-700 underline-offset-2 hover:underline"
                >
                  View trip <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissedForKey(bannerKey)}
        aria-label="Dismiss trip updates"
        className="cursor-pointer rounded-full p-1 text-text-secondary transition-colors hover:bg-accent-100 hover:text-text-primary"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
