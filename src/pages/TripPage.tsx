// Trip dashboard (#/trip/:id), PRD v2 §4.
// Header: cities, dates, duration, countdown, packing progress, refresh. Two tabs:
//  - Overview: stat tiles, map + holidays, weather, transport + checklist, events.
//  - Packing list (?tab=packing): the checklist on its own.
// Every external service loads, fails and refreshes on its own (useTripServices), and the
// checklist only depends on the saved trip, so it works while data loads or after a failure.
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock,
  CloudSun,
  ListChecks,
  Map as MapIcon,
  Moon,
  PartyPopper,
  RefreshCw,
  Ruler,
  Thermometer,
  Ticket,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { haversineKm } from '../api/distance'
import { Card, ServiceCard } from '../components/Card'
import ChecklistCard from '../components/ChecklistCard'
import EventsPanel from '../components/EventsPanel'
import HolidaysPanel from '../components/HolidaysPanel'
import StatTile from '../components/StatTile'
import TransportCard from '../components/TransportCard'
import TripMap, { MapLegend } from '../components/TripMap'
import WeatherPanel from '../components/WeatherPanel'
import { db } from '../db'
import { checklistProgress, formatProgress } from '../lib/checklist'
import { daysBetween, formatRange, today } from '../lib/dates'
import { shortName } from '../lib/style'
import { formatDuration, km, mi } from '../lib/transport'
import { useTripServices } from '../lib/useTripServices'
import type { ServiceKey, Trip } from '../types'

function countdown(trip: Trip): string {
  const untilStart = daysBetween(today(), trip.startDate)
  if (untilStart > 1) return `Starts in ${untilStart} days`
  if (untilStart === 1) return 'Starts tomorrow'
  if (untilStart === 0) return 'Starts today'
  return daysBetween(today(), trip.endDate) >= 0 ? 'Happening now' : 'Past trip'
}

type Tab = 'overview' | 'packing'

export default function TripPage() {
  const rawId = useParams().id
  const id = Number(rawId)
  const validId = Number.isInteger(id) && id > 0
  // undefined while loading, null if not found
  const trip = useLiveQuery(async () => (validId ? ((await db.trips.get(id)) ?? null) : null), [id, validId])
  const { loading, refresh } = useTripServices(id, trip)
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'packing' ? 'packing' : 'overview'
  const setTab = (t: Tab) => setParams(t === 'packing' ? { tab: 'packing' } : {}, { replace: true })

  if (trip === undefined) return null
  if (trip === null) return <TripNotFound />

  const days = daysBetween(trip.startDate, trip.endDate) + 1
  const nights = days - 1
  const progress = checklistProgress(trip.checklist)
  const busy = loading.size > 0

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {/* Header */}
      <header className="pt-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/history" className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
            <ArrowLeft className="size-4" /> My trips
          </Link>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={busy}
            className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${busy ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            {busy ? 'Updating…' : 'Refresh data'}
          </button>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Trip overview</p>
        <h1 className="mt-3 font-display text-6xl leading-[0.95] text-ink sm:text-7xl">{shortName(trip.destination)}</h1>
        <p className="mt-3 text-ink-soft">
          From {shortName(trip.origin)} to {trip.destination.name}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Chip icon={CalendarDays}>{formatRange(trip.startDate, trip.endDate)}</Chip>
          <Chip icon={Moon}>
            {days} {days === 1 ? 'day' : 'days'} · {nights} {nights === 1 ? 'night' : 'nights'}
          </Chip>
          <Chip icon={Clock}>{countdown(trip)}</Chip>
          <button
            type="button"
            onClick={() => setTab('packing')}
            className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent-strong ring-1 ring-accent/20 hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ListChecks className="size-4" /> {formatProgress(progress)}
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Trip sections" className="mt-8 flex gap-1 border-b border-line">
          <TabButton selected={tab === 'overview'} onClick={() => setTab('overview')} controls="panel-overview">
            Overview
          </TabButton>
          <TabButton selected={tab === 'packing'} onClick={() => setTab('packing')} controls="panel-packing">
            Packing list
            <span className="ml-1.5 rounded-full bg-paper px-1.5 text-xs text-ink-soft ring-1 ring-line">{progress.total}</span>
          </TabButton>
        </div>
      </header>

      <div className="mt-8">
        {tab === 'overview' ? (
          <div id="panel-overview" role="tabpanel" aria-label="Overview" className="space-y-6">
            <Overview trip={trip as Trip & { id: number }} loading={loading} refresh={refresh} />
          </div>
        ) : (
          <div id="panel-packing" role="tabpanel" aria-label="Packing list" className="max-w-3xl">
            <ChecklistCard trip={{ ...trip, id }} hasForecast={hasForecastOrUnknown(trip, loading)} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Hide the "no forecast" note until we actually know the weather kind. */
function hasForecastOrUnknown(trip: Trip, loading: ReadonlySet<ServiceKey>): boolean {
  const weather = trip.snapshot?.weather?.data
  return !weather ? loading.has('weather') || !trip.snapshot?.weather : weather.kind === 'forecast'
}

function Overview({
  trip,
  loading,
  refresh,
}: {
  trip: Trip & { id: number }
  loading: ReadonlySet<ServiceKey>
  refresh: (keys?: ServiceKey[]) => void
}) {
  const snap = trip.snapshot ?? {}
  const straightKm = haversineKm(trip.origin, trip.destination)
  const weather = snap.weather?.data
  const route = snap.route?.data
  const events = snap.events?.data
  const avgHigh = weather?.days.length ? weather.days.reduce((sum, d) => sum + d.tempMax, 0) / weather.days.length : null
  const days = daysBetween(trip.startDate, trip.endDate) + 1
  const isHistorical = weather?.kind === 'historical'
  const retry = (key: ServiceKey) => () => refresh([key])
  const dash = (key: ServiceKey) => (loading.has(key) ? '…' : '–')

  return (
    <>
      {/* Stat tiles. Straight-line and road distance are labeled separately (FR-9). */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatTile
          hero
          label="Straight-line distance"
          icon={Ruler}
          value={
            <>
              {Math.round(straightKm).toLocaleString()}
              <span className="ml-1.5 text-2xl font-medium text-ink-muted">km</span>
            </>
          }
          detail={`${mi(straightKm)} as the crow flies`}
        />
        <StatTile
          label="Drive"
          icon={Car}
          value={route?.kind === 'route' ? formatDuration(route.durationMin) : route?.kind === 'none' ? 'No road' : dash('route')}
          detail={route?.kind === 'route' ? `${km(route.distanceKm)} by road` : 'by road'}
        />
        <StatTile label="Trip length" icon={Moon} value={days} detail={days === 1 ? 'day' : 'days'} />
        <StatTile
          label="Avg. high"
          icon={Thermometer}
          value={avgHigh === null ? dash('weather') : `${Math.round(avgHigh)}°C`}
          detail={isHistorical ? 'last year, not a forecast' : 'forecast'}
        />
        <StatTile label="Events" icon={Ticket} value={events ? events.length : dash('events')} detail="within 50 km" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Map" icon={MapIcon} subtitle={`${shortName(trip.origin)} → ${shortName(trip.destination)}`} className="lg:col-span-2">
          <div className="h-80">
            <TripMap origin={trip.origin} destination={trip.destination} road={route?.kind === 'route' ? route.geometry : undefined} />
          </div>
          <MapLegend hasRoad={route?.kind === 'route'} />
        </Card>
        <ServiceCard
          title="Public holidays"
          icon={PartyPopper}
          subtitle={`Nationwide holidays in ${trip.destination.countryCode ?? 'this country'}; regional ones are marked`}
          state={snap.holidays}
          loading={loading.has('holidays')}
          onRetry={retry('holidays')}
        >
          {(holidays) => <HolidaysPanel holidays={holidays} />}
        </ServiceCard>
      </div>

      <ServiceCard
        title="Weather"
        icon={CloudSun}
        subtitle={
          isHistorical
            ? 'Your dates are beyond the 16-day forecast, so this is last year’s weather for the same dates.'
            : 'Daily forecast for your stay'
        }
        action={
          isHistorical ? (
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              Historical · not a forecast
            </span>
          ) : weather ? (
            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">Forecast</span>
          ) : undefined
        }
        state={snap.weather}
        loading={loading.has('weather')}
        onRetry={retry('weather')}
      >
        {(w) => <WeatherPanel weather={w} />}
      </ServiceCard>

      {/* Row below Weather: getting there + packing list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TransportCard trip={trip} straightKm={straightKm} route={snap.route} loading={loading.has('route')} onRetry={retry('route')} />
        <ChecklistCard trip={trip} hasForecast={hasForecastOrUnknown(trip, loading)} />
      </div>

      <ServiceCard
        title="Events nearby"
        icon={Ticket}
        subtitle="Ticketmaster listings within 50 km during your dates"
        state={snap.events}
        loading={loading.has('events')}
        onRetry={retry('events')}
      >
        {(list) => <EventsPanel events={list} />}
      </ServiceCard>
    </>
  )
}

function TabButton({
  selected,
  onClick,
  controls,
  children,
}: {
  selected: boolean
  onClick: () => void
  controls: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      onClick={onClick}
      className={`-mb-px flex items-center border-b-2 px-4 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-accent ${
        selected ? 'border-ink font-semibold text-ink' : 'border-transparent font-medium text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-ink-soft">
      <Icon className="size-4 text-ink-muted" />
      {children}
    </span>
  )
}

function TripNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-5xl text-ink">Trip not found.</h1>
      <p className="mt-4 text-ink-soft">
        It may have been deleted, or it was saved in a different browser. Trips live only in the browser that created them.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/history" className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-paper">
          My trips
        </Link>
        <Link to="/" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong">
          Discover places
        </Link>
      </div>
    </div>
  )
}
