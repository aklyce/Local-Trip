// My trips (#/history), PRD v2 FR-19 to FR-23.
// Newest-first trip cards with cities, dates, status and packing progress; case-insensitive
// search by origin or destination; upcoming/past counts for the *visible* results; confirmed
// delete; empty states that always offer a next step. Data lives only in this browser.
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Bookmark, CalendarDays, ListChecks, Route, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { haversineKm } from '../api/distance'
import ConfirmDialog from '../components/ConfirmDialog'
import { db } from '../db'
import { checklistProgress, formatProgress } from '../lib/checklist'
import { daysBetween, formatRange, today } from '../lib/dates'
import { usePlanTrip } from '../lib/planTrip'
import { placeGradient, shortName } from '../lib/style'
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
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      {/* Hero: headline left, supporting text right */}
      <section className="grid gap-8 pb-10 pt-12 sm:pt-16 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">A few plans to look forward to</p>
          <h1 className="mt-4 font-display text-6xl leading-[0.95] text-ink sm:text-8xl">
            Your little
            <br />
            <span className="text-accent">escapes.</span>
          </h1>
        </div>
        <div className="lg:pb-3">
          <div className="mb-4 h-px w-12 bg-ink-muted/50" />
          <p className="text-ink-soft">Pick up where you left off. Your plans and packing lists live in this browser.</p>
          <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
            <span className="font-semibold text-ink">{upcoming}</span> upcoming · <span className="font-semibold text-ink">{past}</span>{' '}
            past{q && ' (matching your search)'}
          </p>
        </div>
      </section>

      {/* Search + new trip */}
      <div className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-3 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Search your trips by city</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search your trips by city"
            className="w-full rounded-2xl border border-line bg-paper py-3 pl-10 pr-10 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:bg-white focus:outline-none focus:ring-3 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-line/60 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => planTrip()}
          className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Plan another trip <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex justify-between text-sm text-ink-muted">
        <span>Saved trips · newest first</span>
        <span>Saved on this device</span>
      </div>

      {deleteError && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {deleteError}
        </p>
      )}

      <div className="mt-6">
        {trips.length === 0 ? (
          <EmptyHistory onPlan={() => planTrip()} />
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-4 py-14 text-center">
            <Search className="size-7 text-ink-muted" strokeWidth={1.5} />
            <p className="text-ink-soft">No saved trips match “{filter.trim()}”.</p>
            <button
              type="button"
              onClick={() => setFilter('')}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              Clear search
            </button>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((t) => (
              <TripCard key={t.id} trip={t} onDelete={() => setPendingDelete(t)} />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this trip?"
        confirmLabel="Delete trip"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete && (
          <>
            Your trip to <strong className="text-ink">{shortName(pendingDelete.destination)}</strong> (
            {formatRange(pendingDelete.startDate, pendingDelete.endDate)}) and its packing list will be removed from this
            browser. This can’t be undone.
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}

function TripCard({ trip: t, onDelete }: { trip: Trip; onDelete: () => void }) {
  const upcoming = isUpcoming(t)
  const city = shortName(t.destination)

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none">
      <Link to={`/trip/${t.id}`} className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-accent">
        <div className="relative h-32 p-4 text-white" style={{ background: placeGradient(t.destination.name) }}>
          <span
            className={`rounded-full px-2.5 py-1 text-sm font-semibold ${upcoming ? 'bg-white text-ink' : 'bg-black/30 text-white backdrop-blur'}`}
          >
            {upcoming ? 'Upcoming' : 'Past'}
          </span>
          <div className="absolute bottom-3 left-4 right-4 truncate font-display text-4xl">{city}</div>
        </div>
        <div className="space-y-2 p-5 text-sm text-ink-soft">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-ink-muted" /> {formatRange(t.startDate, t.endDate)}
          </div>
          <div className="flex items-center gap-2">
            <Route className="size-4 text-ink-muted" />
            <span className="truncate">
              from {shortName(t.origin)} · {Math.round(haversineKm(t.origin, t.destination)).toLocaleString()} km straight-line
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-ink-muted" /> {formatProgress(checklistProgress(t.checklist))}
          </div>
        </div>
      </Link>
      {/* Always visible (not hover-only) so it works on touch screens. */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete trip to ${city}`}
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  )
}

function EmptyHistory({ onPlan }: { onPlan: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <Bookmark className="size-7 text-ink" strokeWidth={1.5} />
      <h2 className="font-display text-4xl text-ink">Your next adventure starts here.</h2>
      <p className="max-w-md text-ink-soft">
        You haven’t saved any trips in this browser yet. Plan one and it will show up here, with its weather, events and packing list.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onPlan}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          Plan a trip
        </button>
        <Link to="/" className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-paper">
          Browse ideas
        </Link>
      </div>
    </div>
  )
}
