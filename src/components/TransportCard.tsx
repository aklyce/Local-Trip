// Getting there (PRD v2 FR-12 to FR-14).
//  - Driving: OSRM road distance and time, or an explicit "no road route" / unavailable state.
//  - Drive and Fly sit side by side so they can be compared; the suggested one is filled cobalt.
//  - Flying: suggested when the drive is over 8 hours or there is no road route. Trips under
//    SHORT_HOP_KM straight-line get no flight estimate: airports alone take longer than the drive. The time is a
//    rough estimate (straight-line distance ÷ 800 km/h, about 500 mph, + 2 h for airports), never a schedule or price.
//  - External search: Google Flights (dates prefilled through its search query) and Rome2Rio
//    (no date support, so we say so).
import { ArrowUpRight, Car, Plane, TrainFront } from 'lucide-react'
import { createContext, useContext, type ReactNode } from 'react'
import { ButtonLink } from '@/components/base/buttons/button'
import { Skeleton } from '@/components/base/skeleton/skeleton'
import { cx } from '@/utils/cx'
import { shortName } from '../lib/style'
import { AIRPORT_OVERHEAD_H, FLIGHT_KMH, LONG_DRIVE_MIN, SHORT_HOP_KM, formatDuration, googleFlightsUrl, km, mi, rome2rioUrl } from '../lib/transport'
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
  const flightMin = (straightKm / FLIGHT_KMH + AIRPORT_OVERHEAD_H) * 60
  // Short hop with a road: flying never makes sense, so the Fly panel says so instead of an estimate.
  const shortHop = straightKm < SHORT_HOP_KM && data?.kind !== 'none'
  const driveMin = data?.kind === 'route' ? data.durationMin : null
  const suggestFlight = data?.kind === 'none' || (driveMin !== null && driveMin > LONG_DRIVE_MIN)
  // Without route data we can't judge the drive, so neither option is highlighted.
  const pick: Mode | null = suggestFlight ? 'fly' : driveMin !== null ? 'drive' : null
  // Bars share one scale (the slower option is full width), so the gap reads at a glance.
  const longest = Math.max(driveMin ?? 0, shortHop ? 0 : flightMin)
  const stale = route?.status !== 'ok' && !!data && !loading

  return (
    <Card title="Getting there" icon={Car} subtitle={`${shortName(trip.origin)} → ${shortName(trip.destination)}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Driving */}
        <Option
          mode="drive"
          picked={pick === 'drive'}
          tag={pick === 'drive' ? (driveMin !== null && driveMin <= 4 * 60 ? 'Easy drive' : 'Best option') : undefined}
          share={driveMin !== null ? driveMin / longest : null}
          note={`${mi(straightKm)} in a straight line. Roads are always longer.`}
        >
          {driveMin !== null && data?.kind === 'route' ? (
            <>
              <Duration>{formatDuration(driveMin)}</Duration>
              <Detail>
                {mi(data.distanceKm)} by road ({km(data.distanceKm)})
              </Detail>
              {stale && <p className="mt-1 text-body-regular text-status-yellow-text">Saved route. The latest refresh didn’t work.</p>}
            </>
          ) : data?.kind === 'none' ? (
            <>
              <Duration>No road</Duration>
              <Detail>No driving route between these places.</Detail>
            </>
          ) : loading ? (
            <>
              <Skeleton className="h-11 w-32" />
              <p className="mt-2 text-body-regular text-text-secondary" role="status">
                Finding a driving route…
              </p>
            </>
          ) : route ? (
            <ServiceMessage state={route} onRetry={onRetry} />
          ) : null}
        </Option>

        {/* Flying: always shown so the two can be compared; highlighted when the drive is long or impossible. */}
        <Option
          mode="fly"
          picked={pick === 'fly'}
          tag={pick === 'fly' ? (data?.kind === 'none' ? 'Only way there' : 'Faster') : undefined}
          share={shortHop ? null : flightMin / longest}
          note={
            shortHop
              ? 'Under 200 mi, check-in and security take longer than the whole drive.'
              : 'Rough estimate: straight line at about 500 mph plus 2 h for airports. Not a schedule or a price.'
          }
        >
          {shortHop ? (
            <>
              <Duration>Not worth it</Duration>
              <Detail>Too short to fly</Detail>
            </>
          ) : (
            <>
              <Duration>≈ {formatDuration(flightMin)}</Duration>
              <Detail>door to door</Detail>
            </>
          )}
        </Option>
      </div>

      {/* External search */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ExternalLink href={googleFlightsUrl(trip)} icon={Plane} label="Search Google Flights" note="Opens with your trip dates" />
        <ExternalLink href={rome2rioUrl(trip)} icon={TrainFront} label="Compare on Rome2Rio" note="Pick your dates on Rome2Rio" />
      </div>
    </Card>
  )
}

type Mode = 'drive' | 'fly'
const MODES = { drive: { label: 'Drive', icon: Car }, fly: { label: 'Fly', icon: Plane } } as const
// The highlighted panel is filled cobalt; its children read this to switch to white text.
const PickedContext = createContext(false)

/** One travel option. The suggested one is filled; the other stays outlined. */
function Option({
  mode,
  picked,
  tag,
  share,
  note,
  children,
}: {
  mode: Mode
  picked: boolean
  /** Short reason shown on the suggested panel, e.g. "Faster". */
  tag?: string
  /** This option's time as a share of the slower one (0 to 1), or null when unknown. */
  share: number | null
  note: string
  children: ReactNode
}) {
  const { label, icon: Icon } = MODES[mode]
  return (
    <section
      aria-label={label}
      className={cx(
        'flex flex-col rounded-2xl p-4',
        picked ? 'bg-accent-600 text-white' : 'border border-border-button-default text-text-primary',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-body-semibold">
          <Icon className="size-4" aria-hidden /> {label}
        </h3>
        {tag && <span className="rounded-full bg-white px-2 py-0.5 text-caption-1-semibold text-accent-700">{tag}</span>}
      </div>
      <div className="mt-4 flex-1">
        <PickedContext.Provider value={picked}>{children}</PickedContext.Provider>
      </div>
      {share !== null && (
        <div aria-hidden className={cx('mt-4 h-1.5 overflow-hidden rounded-full', picked ? 'bg-white/25' : 'bg-background-tertiary-default')}>
          <div className={cx('h-full rounded-full', picked ? 'bg-white' : 'bg-text-primary')} style={{ width: `${Math.max(share, 0.04) * 100}%` }} />
        </div>
      )}
      <p className={cx('mt-3 text-body-regular', picked ? 'text-white/75' : 'text-text-tertiary')}>{note}</p>
    </section>
  )
}

function Duration({ children }: { children: ReactNode }) {
  return <p className="whitespace-nowrap font-display text-title-1-bold leading-none tracking-tight tabular-nums xl:text-display-4-bold">{children}</p>
}

function Detail({ children }: { children: ReactNode }) {
  const picked = useContext(PickedContext)
  return <p className={cx('mt-1.5 text-body-regular', picked ? 'text-white/85' : 'text-text-secondary')}>{children}</p>
}

function ExternalLink({ href, icon, label, note }: { href: string; icon: typeof Plane; label: string; note: string }) {
  return (
    <div>
      <ButtonLink href={href} target="_blank" rel="noreferrer" variant="secondary" leadingIcon={icon} trailingIcon={ArrowUpRight} className="w-full">
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </ButtonLink>
      <p className="mt-1 text-center text-body-regular text-text-tertiary">{note}</p>
    </div>
  )
}
