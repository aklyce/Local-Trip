// My trips (#/history), PRD v2 FR-19 to FR-23.
// Newest-first trip cards with cities, dates, status and packing progress; case-insensitive
// search by origin or destination; upcoming/past counts for the *visible* results; confirmed
// delete; empty states that always offer a next step. Data lives only in this browser.
import { useLiveQuery } from 'dexie-react-hooks'
import { Bookmark, CalendarDays, ListChecks, Plus, Route, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { haversineKm } from '../api/distance'
import { Chip } from '@/components/base/badges/chip'
import { Button, ButtonLink } from '@/components/base/buttons/button'
import { AlertDialog } from '@/components/base/modal/modal'
import { SearchField } from '@/components/base/search-field/search-field'
import { EmptyState, Notice } from '../components/Card'
import { db } from '../db'
import { checklistProgress, formatProgress } from '../lib/checklist'
import { daysBetween, formatRange, today } from '../lib/dates'
import { usePlanTrip } from '../lib/planTrip'
import { cx } from '@/utils/cx'
import TopoArt from '../components/TopoArt'
import { FIELD, shortName } from '../lib/style'
import { mi } from '../lib/transport'
import type { Trip } from '../types'

/** A trip ending today still counts as upcoming (FR-21). */
const isUpcoming = (t: Trip) => daysBetween(today(), t.endDate) >= 0

export default function HistoryPage() {
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').reverse().toArray(), [])
  const [filter, setFilter] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Trip | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const planTrip = usePlanTrip()

  if (!trips) return null

  const q = filter.trim().toLowerCase()
  const shown = q
    ? trips.filter((t) => t.destination.name.toLowerCase().includes(q) || t.origin.name.toLowerCase().includes(q))
    : trips
  const upcoming = shown.filter(isUpcoming).length
  const past = shown.length - upcoming

  async function confirmDelete() {
    const trip = pendingDelete
    setPendingDelete(null)
    if (trip?.id === undefined) return
    try {
      await db.trips.delete(trip.id)
      setDeleteError(null)
    } catch {
      setDeleteError('Couldn’t delete that trip from this browser’s storage. Please try again.')
    }
  }

  return (
    <>
      {/* Header band: same cobalt field and contour art as Discover and the trip page. */}
      <header className={cx('relative isolate overflow-hidden', FIELD.trip)}>
        <TopoArt seed="My trips" peaks={4} rings={12} animate className="-z-10 opacity-30" />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-32 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-poster">My trips</h1>
            <p className="mt-4 text-headline-regular text-white/85">Your plans and packing lists, saved in this browser.</p>
          </div>
          {/* Counts follow the visible results (FR-21). */}
          <dl className="flex gap-8" aria-live="polite">
            <div>
              <dd className="font-display text-display-2-bold leading-none tracking-tight tabular-nums">{upcoming}</dd>
              <dt className="mt-1 text-body-medium text-white/80">upcoming</dt>
            </div>
            <div>
              <dd className="font-display text-display-2-bold leading-none tracking-tight tabular-nums">{past}</dd>
              <dt className="mt-1 text-body-medium text-white/80">past</dt>
            </div>
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      {/* Search + new trip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          aria-label="Search your trips by city"
          placeholder="Search your trips by city"
          value={filter}
          onChange={setFilter}
          className="min-w-0 flex-1"
        />
        <Button onClick={() => planTrip()} leadingIcon={Plus}>
          Plan another trip
        </Button>
      </div>

      <p className="mt-6 text-body-regular text-text-secondary">
        Newest first{q && ', matching your search'}
      </p>

      {deleteError && (
        <Notice tone="error" className="mt-4">
          {deleteError}
        </Notice>
      )}

      <div className="mt-4">
        {trips.length === 0 ? (
          <EmptyHistory onPlan={() => planTrip()} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No trips match"
            className="py-14"
            actions={
              <Button variant="secondary" onClick={() => setFilter('')}>
                Clear search
              </Button>
            }
          >
            Nothing saved for “{filter.trim()}”. Search by where you left from or where you went.
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((t) => (
              <TripCard key={t.id} trip={t} onDelete={() => setPendingDelete(t)} />
            ))}
          </ul>
        )}
      </div>

      {/* BoardUI AlertDialog: role="alertdialog", focus starts on Cancel, no backdrop dismissal (FR-22). */}
      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this trip?"
        confirmLabel="Delete trip"
        icon={Trash2}
        onConfirm={() => void confirmDelete()}
        description={
          pendingDelete && (
            <>
              Your trip to <strong className="text-text-primary">{shortName(pendingDelete.destination)}</strong> (
              {formatRange(pendingDelete.startDate, pendingDelete.endDate)}) and its packing list will be removed from this
              browser. This can’t be undone.
            </>
          )
        }
      />
      </div>
    </>
  )
}

function TripCard({ trip: t, onDelete }: { trip: Trip; onDelete: () => void }) {
  const upcoming = isUpcoming(t)
  const city = shortName(t.destination)

  return (
    <li className="relative flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default transition-colors hover:border-border-button-hover">
      <Link to={`/trip/${t.id}`} className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring">
        <div className={cx('relative h-24 overflow-hidden', FIELD.trip)}>
          <TopoArt seed={t.destination.name} className="opacity-40" />
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-place text-text-primary">{city}</h2>
            <Chip color={upcoming ? 'blue' : 'neutral'} variant="caption">
              {upcoming ? 'Upcoming' : 'Past'}
            </Chip>
          </div>
          <div className="mt-3 space-y-1.5 text-body-regular text-text-secondary">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-foreground-icon-tertiary" aria-hidden /> {formatRange(t.startDate, t.endDate)}
            </div>
            <div className="flex items-center gap-2">
              <Route className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
              <span className="truncate">
                from {shortName(t.origin)} · {mi(haversineKm(t.origin, t.destination))} straight-line
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-foreground-icon-tertiary" aria-hidden /> {formatProgress(checklistProgress(t.checklist))}
            </div>
          </div>
        </div>
      </Link>
      {/* Always visible (not hover-only) so it works on touch screens. */}
      <Button
        variant="secondary"
        size="small"
        iconOnly
        leadingIcon={Trash2}
        onClick={onDelete}
        aria-label={`Delete trip to ${city}`}
        className="absolute right-3 top-3"
      />
    </li>
  )
}

function EmptyHistory({ onPlan }: { onPlan: () => void }) {
  return (
    <EmptyState
      icon={Bookmark}
      title="No trips yet"
      className="py-16"
      actions={
        <>
          <Button onClick={onPlan}>Plan a trip</Button>
          <ButtonLink href="#/" variant="secondary">
            Browse ideas
          </ButtonLink>
        </>
      }
    >
      Plan one and it will show up here, with its weather, events and packing list.
    </EmptyState>
  )
}
