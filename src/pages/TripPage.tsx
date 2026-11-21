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
  Map as MapIcon,
  Moon,
  PartyPopper,
  RefreshCw,
  Ruler,
  Thermometer,
  Ticket,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Chip } from '@/components/base/badges/chip'
import { Button, ButtonLink } from '@/components/base/buttons/button'
import { Skeleton, SkeletonText } from '@/components/base/skeleton/skeleton'
import { SpinnerGlyph } from '@/components/base/spinner/spinner'
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs'
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
import { checklistProgress } from '../lib/checklist'
import { daysBetween, formatRange, today } from '../lib/dates'
import { cx } from '@/utils/cx'
import TopoArt from '../components/TopoArt'
import { FIELD, shortName } from '../lib/style'
import { KM_PER_MILE, formatDuration, km, mi } from '../lib/transport'
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
    <>
      {/* Header band: cobalt field with this destination's own contour art. */}
      <header className={cx('relative isolate overflow-hidden', FIELD.trip)}>
        <TopoArt seed={trip.destination.name} peaks={4} rings={14} animate className="-z-10 opacity-35" />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28">
          <div className="flex items-center justify-between gap-4">
            <ButtonLink href="#/history" variant="secondary" size="small" leadingIcon={ArrowLeft}>
              My trips
            </ButtonLink>
            <Button variant="secondary" size="small" leadingIcon={busy ? BusyGlyph : RefreshCw} onClick={() => refresh()} disabled={busy}>
              {busy ? 'Updating…' : 'Refresh data'}
            </Button>
          </div>

          <h1 className="mt-10 text-poster">{shortName(trip.destination)}</h1>
          <p className="mt-4 text-headline-regular text-white/85">
            From {shortName(trip.origin)} to {trip.destination.name}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Fact icon={CalendarDays}>{formatRange(trip.startDate, trip.endDate)}</Fact>
            <Fact icon={Moon}>
              {days} {days === 1 ? 'day' : 'days'} · {nights} {nights === 1 ? 'night' : 'nights'}
            </Fact>
            <Fact icon={Clock}>{countdown(trip)}</Fact>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      {/* BoardUI Tabs (React Aria): arrow keys move between tabs; the tab is kept in the URL. */}
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as Tab)} className="mt-6">
        <TabList aria-label="Trip sections">
          <Tab id="overview">Overview</Tab>
          <Tab id="packing" count={`${progress.done}/${progress.total}`}>
            Packing list
          </Tab>
        </TabList>
        <TabPanel id="overview" className="mt-6 space-y-5">
          <Overview trip={trip as Trip & { id: number }} loading={loading} refresh={refresh} />
        </TabPanel>
        <TabPanel id="packing" className="mt-6 max-w-3xl">
          <ChecklistCard trip={{ ...trip, id }} hasForecast={hasForecastOrUnknown(trip, loading)} />
        </TabPanel>
      </Tabs>
      </div>
    </>
  )
}

function BusyGlyph({ className }: { className?: string }) {
  return <SpinnerGlyph size="sm" className={`${className ?? ''} text-current`} />
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
              {Math.round(straightKm / KM_PER_MILE).toLocaleString()}
              <span className="ml-1.5 text-title-2-medium text-white/60">mi</span>
            </>
          }
          detail={`${km(straightKm)} as the crow flies`}
        />
        <StatTile
          label="Drive"
          icon={Car}
          value={route?.kind === 'route' ? formatDuration(route.durationMin) : route?.kind === 'none' ? 'No road' : dash('route')}
          detail={route?.kind === 'route' ? `${mi(route.distanceKm)} by road` : 'by road'}
        />
        <StatTile label="Trip length" icon={Moon} value={days} detail={days === 1 ? 'day' : 'days'} />
        <StatTile
          label="Avg. high"
          icon={Thermometer}
          value={avgHigh === null ? dash('weather') : `${Math.round(avgHigh)}°C`}
          detail={isHistorical ? 'last year, not a forecast' : 'forecast'}
        />
        <StatTile label="Events" icon={Ticket} value={events ? events.length : dash('events')} detail="within 31 mi" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
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
        skeleton={<SkeletonText lines={4} lineClassName="h-5" />}
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
            <Chip color="yellow" className="shrink-0">
              Historical · not a forecast
            </Chip>
          ) : weather ? (
            <Chip color="blue" className="shrink-0">
              Forecast
            </Chip>
          ) : undefined
        }
        state={snap.weather}
        loading={loading.has('weather')}
        onRetry={retry('weather')}
        skeleton={<TileSkeleton count={Math.min(days, 5)} className="h-48" />}
      >
        {(w) => <WeatherPanel weather={w} />}
      </ServiceCard>

      {/* Row below Weather: getting there + packing list */}
      <div className="grid gap-5 lg:grid-cols-2">
        <TransportCard trip={trip} straightKm={straightKm} route={snap.route} loading={loading.has('route')} onRetry={retry('route')} />
        <ChecklistCard trip={trip} hasForecast={hasForecastOrUnknown(trip, loading)} />
      </div>

      <ServiceCard
        title="Events nearby"
        icon={Ticket}
        subtitle="Ticketmaster listings within 31 mi (50 km) during your dates"
        state={snap.events}
        loading={loading.has('events')}
        onRetry={retry('events')}
        skeleton={<TileSkeleton count={3} className="h-56" />}
      >
        {(list) => <EventsPanel events={list} />}
      </ServiceCard>
    </>
  )
}

/** Loading placeholder: a row of blocks the size of the real tiles (weather days, event cards). */
function TileSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cx('rounded-3xl', className)} />
      ))}
    </div>
  )
}

/** One trip fact in the header (dates, length, countdown). */
function Fact({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <Chip color="gray" variant="subtle" className="gap-1.5 px-2">
      <Icon className="size-4 text-foreground-icon-secondary" aria-hidden />
      {children}
    </Chip>
  )
}

function TripNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-40 text-center sm:px-6">
      <h1 className="font-display text-display-2-semibold tracking-tight text-text-primary">Trip not found</h1>
      <p className="mt-3 text-body-regular text-text-secondary">
        It may have been deleted, or it was saved in a different browser. Trips live only in the browser that created them.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink href="#/history" variant="secondary">
          My trips
        </ButtonLink>
        <ButtonLink href="#/">Discover places</ButtonLink>
      </div>
    </div>
  )
}
