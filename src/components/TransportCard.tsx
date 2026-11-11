// Getting there (PRD v2 FR-12 to FR-14).
//  - Driving: OSRM road distance and time, or an explicit "no road route" / unavailable state.
//  - Flying: suggested when the drive is over 8 hours or there is no road route. The time is a
//    rough estimate (straight-line km ÷ 800 km/h + 2 h for airports), never a schedule or price.
//  - External search: Google Flights (dates prefilled through its search query) and Rome2Rio
//    (no date support, so we say so).
import { ArrowUpRight, Car, Info, Plane, TrainFront } from 'lucide-react'
import { shortName } from '../lib/style'
import { AIRPORT_OVERHEAD_H, FLIGHT_KMH, LONG_DRIVE_MIN, formatDuration, googleFlightsUrl, km, mi, rome2rioUrl } from '../lib/transport'
import type { RouteResult, ServiceState, Trip } from '../types'
import { Card, ServiceMessage } from './Card'

interface Props {
  trip: Trip
  straightKm: number
  route?: ServiceState<RouteResult>
  loading: boolean
  onRetry: () => void
}

export default function TransportCard({ trip, straightKm, route, loading, onRetry }: Props) {
  const data = route?.data
  const flightHours = straightKm / FLIGHT_KMH + AIRPORT_OVERHEAD_H
  const suggestFlight = data?.kind === 'none' || (data?.kind === 'route' && data.durationMin > LONG_DRIVE_MIN)
  // Without route data we can't judge the drive, so show the estimate without recommending it.
  const showFlight = suggestFlight || (!data && !loading)

  return (
    <Card title="Getting there" icon={Car} subtitle={`${shortName(trip.origin)} → ${shortName(trip.destination)}`}>
      <div className="space-y-4">
        {/* Driving */}
        <div className="rounded-2xl bg-paper p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Car className="size-4 text-accent" /> Driving
          </p>
          {data?.kind === 'route' ? (
            <p className="mt-1 text-ink">
              <span className="font-display text-3xl">{formatDuration(data.durationMin)}</span>
              <span className="ml-2 text-sm text-ink-soft">
                {km(data.distanceKm)} · {mi(data.distanceKm)} by road
              </span>
            </p>
          ) : data?.kind === 'none' ? (
            <p className="mt-1 text-sm text-ink-soft">No road route found between these places.</p>
          ) : loading ? (
            <p className="mt-1 text-sm text-ink-muted" role="status">
              Finding a driving route…
            </p>
          ) : route ? (
            <div className="mt-2">
              <ServiceMessage state={route} onRetry={onRetry} />
            </div>
          ) : null}
          {route?.status !== 'ok' && data && !loading && (
            <p className="mt-1 text-sm text-amber-800">Saved route — the latest refresh didn’t work.</p>
          )}
          <p className="mt-2 text-sm text-ink-muted">
            Straight-line distance: {km(straightKm)} ({mi(straightKm)}). Roads are always longer.
          </p>
        </div>

        {/* Flying */}
        {showFlight && (
          <div className={`rounded-2xl p-4 ${suggestFlight ? 'bg-accent-soft' : 'bg-paper'}`}>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Plane className="size-4 text-accent" />
              {suggestFlight
                ? data?.kind === 'none'
                  ? 'Consider flying — there’s no road route'
                  : 'Consider flying — that’s a long drive'
                : 'If you fly'}
            </p>
            <p className="mt-1 text-ink">
              <span className="font-display text-3xl">≈ {formatDuration(flightHours * 60)}</span>
              <span className="ml-2 text-sm text-ink-soft">door to door</span>
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Rough estimate: straight-line distance at 800 km/h plus 2 h for airports. Not a schedule or a price.
            </p>
          </div>
        )}

        {/* External search */}
        <div className="grid gap-2 sm:grid-cols-2">
          <ExternalLink href={googleFlightsUrl(trip)} icon={Plane} label="Search Google Flights" note="Opens with your trip dates" />
          <ExternalLink href={rome2rioUrl(trip)} icon={TrainFront} label="Compare on Rome2Rio" note="Pick your dates on Rome2Rio" />
        </div>
      </div>
    </Card>
  )
}

function ExternalLink({ href, icon: Icon, label, note }: { href: string; icon: typeof Plane; label: string; note: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-accent/40 hover:bg-paper focus-visible:outline-2 focus-visible:outline-accent"
    >
      <Icon className="size-5 shrink-0 text-accent" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-sm text-ink-muted">{note}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-ink-muted transition group-hover:text-accent" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  )
}
