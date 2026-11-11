import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CloudSun,
  Map as MapIcon,
  Moon,
  PartyPopper,
  RefreshCw,
  Route,
  Thermometer,
  Ticket,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchSnapshot } from '../api'
import { Card, SectionCard } from '../components/Card'
import EventsPanel from '../components/EventsPanel'
import HolidaysPanel from '../components/HolidaysPanel'
import StatTile from '../components/StatTile'
import TripMap from '../components/TripMap'
import WeatherPanel from '../components/WeatherPanel'
import { db } from '../db'
import { daysBetween, formatRange, today } from '../lib/dates'
import { placeGradient, shortName } from '../lib/style'
import type { Trip, TripSnapshot } from '../types'

const KM_PER_MILE = 1.609344

function countdown(trip: Trip): string {
  const untilStart = daysBetween(today(), trip.startDate)
  if (untilStart > 1) return `Starts in ${untilStart} days`
  if (untilStart === 1) return 'Starts tomorrow'
  if (untilStart === 0) return 'Starts today'
  return daysBetween(today(), trip.endDate) >= 0 ? 'Happening now' : 'Past trip'
}

export default function TripPage() {
  const id = Number(useParams().id)
  // undefined while loading, null if not found
  const trip = useLiveQuery(async () => (await db.trips.get(id)) ?? null, [id])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(
    async (t: Trip) => {
      setLoading(true)
      try {
        const snapshot = await fetchSnapshot(t)
        await db.trips.update(id, { snapshot })
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  // First visit after planning: no cached data yet, so fetch it (once per trip id).
  const autoFetched = useRef<number | null>(null)
  useEffect(() => {
    if (trip && !trip.snapshot && autoFetched.current !== id) {
      autoFetched.current = id
      void refresh(trip)
    }
  }, [trip, id, refresh])

  if (trip === undefined) return null
  if (trip === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <p className="text-ink-soft">Trip not found.</p>
        <Link to="/" className="mt-2 inline-block font-medium text-accent hover:underline">
          Plan a new one
        </Link>
      </div>
    )
  }

  const snap = trip.snapshot
  const nights = daysBetween(trip.startDate, trip.endDate)

  return (
    <>
      {/* Banner */}
      <section className="relative overflow-hidden text-white" style={{ background: placeGradient(trip.destination.name) }}>
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/history" className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
              <ArrowLeft className="size-4" /> My trips
            </Link>
            <button
              onClick={() => refresh(trip)}
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Updating…' : 'Refresh data'}
            </button>
          </div>

          <p className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-white/70">Trip overview</p>
          <h1 className="mt-2 font-display text-5xl font-semibold leading-tight sm:text-7xl">{shortName(trip.destination)}</h1>
          <p className="mt-2 max-w-2xl text-white/75">{trip.destination.name}</p>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Chip icon={CalendarDays}>{formatRange(trip.startDate, trip.endDate)}</Chip>
            <Chip icon={Clock}>{countdown(trip)}</Chip>
            <Chip icon={Route}>from {shortName(trip.origin)}</Chip>
          </div>
        </div>
      </section>

      <div className="relative mx-auto -mt-16 max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        {!snap ? <LoadingState /> : <Dashboard trip={trip} snap={snap} nights={nights} />}
      </div>
    </>
  )
}

function Dashboard({ trip, snap, nights }: { trip: Trip; snap: TripSnapshot; nights: number }) {
  const days = snap.weather.ok ? snap.weather.data.days : []
  const avgHigh = days.length ? days.reduce((sum, d) => sum + d.tempMax, 0) / days.length : null

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatTile
          hero
          label="Distance"
          icon={Route}
          value={
            <>
              {Math.round(snap.distanceKm).toLocaleString()}
              <span className="ml-1.5 text-2xl font-medium text-ink-muted">km</span>
            </>
          }
          detail={`${Math.round(snap.distanceKm / KM_PER_MILE).toLocaleString()} mi as the crow flies`}
        />
        <StatTile label="Trip length" icon={Moon} value={nights} detail={nights === 1 ? 'night' : 'nights'} />
        <StatTile
          label="Avg. high"
          icon={Thermometer}
          value={avgHigh === null ? '–' : `${Math.round(avgHigh)}°`}
          detail={snap.weather.ok && snap.weather.data.kind === 'historical' ? 'last year' : 'forecast'}
        />
        <StatTile label="Events" icon={Ticket} value={snap.events.ok ? snap.events.data.length : '–'} detail="within 50 km" />
        <StatTile label="Holidays" icon={PartyPopper} value={snap.holidays.ok ? snap.holidays.data.length : '–'} detail="public" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Route" icon={MapIcon} subtitle={`${shortName(trip.origin)} → ${shortName(trip.destination)}`} className="lg:col-span-2">
          <div className="h-80">
            <TripMap origin={trip.origin} destination={trip.destination} />
          </div>
        </Card>
        <SectionCard title="Public holidays" icon={PartyPopper} subtitle={trip.destination.countryCode} section={snap.holidays}>
          {(holidays) => <HolidaysPanel holidays={holidays} />}
        </SectionCard>
      </div>

      <SectionCard
        title="Weather"
        icon={CloudSun}
        subtitle={
          snap.weather.ok && snap.weather.data.kind === 'historical'
            ? 'Forecast isn’t available this far out — showing the same dates last year'
            : 'Daily forecast for your stay'
        }
        section={snap.weather}
      >
        {(weather) => <WeatherPanel weather={weather} />}
      </SectionCard>

      <SectionCard title="Events nearby" icon={Ticket} subtitle="From Ticketmaster" section={snap.events}>
        {(events) => <EventsPanel events={events} />}
      </SectionCard>

      <p className="text-center text-xs text-ink-muted">Data updated {new Date(snap.fetchedAt).toLocaleString()}</p>
    </>
  )
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur">
      <Icon className="size-4" />
      {children}
    </span>
  )
}

function LoadingState() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {[2, 1, 1, 1, 1].map((span, i) => (
          <div key={i} className={`h-36 animate-pulse rounded-3xl bg-white ${span === 2 ? 'col-span-2' : ''}`} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-3xl bg-white lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-3xl bg-white" />
      </div>
      <p className="text-center text-sm text-ink-muted">Gathering weather, events and holidays…</p>
    </>
  )
}
