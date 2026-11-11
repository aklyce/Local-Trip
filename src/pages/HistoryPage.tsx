import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Luggage, Plus, Route, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/Card'
import { db } from '../db'
import { daysBetween, formatRange, today } from '../lib/dates'
import { usePlanTrip } from '../lib/planTrip'
import { placeGradient, shortName } from '../lib/style'

export default function HistoryPage() {
  const trips = useLiveQuery(() => db.trips.orderBy('createdAt').reverse().toArray(), [])
  const [filter, setFilter] = useState('')
  const planTrip = usePlanTrip()

  if (!trips) return null

  const q = filter.trim().toLowerCase()
  const shown = q
    ? trips.filter((t) => t.destination.name.toLowerCase().includes(q) || t.origin.name.toLowerCase().includes(q))
    : trips
  const upcoming = trips.filter((t) => daysBetween(today(), t.endDate) >= 0).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">My trips</h1>
          <p className="mt-2 text-ink-soft">
            {trips.length} saved · {upcoming} upcoming
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <label className="flex flex-1 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 sm:w-64">
            <Search className="size-4 text-ink-muted" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search trips"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => planTrip()}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            <Plus className="size-4" /> New
          </button>
        </div>
      </div>

      <div className="mt-8">
        {shown.length === 0 ? (
          <EmptyState icon={Luggage}>
            {trips.length === 0 ? (
              <>
                No trips yet.{' '}
                <button type="button" onClick={() => planTrip()} className="font-medium text-accent hover:underline">
                  Plan your first one
                </button>
              </>
            ) : (
              'No trips match your search.'
            )}
          </EmptyState>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((t) => {
              const past = daysBetween(today(), t.endDate) < 0
              return (
                <li key={t.id} className="group relative overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-xl">
                  <Link to={`/trip/${t.id}`} className="block">
                    <div className="relative h-32 p-5 text-white" style={{ background: placeGradient(t.destination.name) }}>
                      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:18px_18px]" />
                      <span className="relative rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium backdrop-blur">
                        {past ? 'Past' : 'Upcoming'}
                      </span>
                      <div className="absolute bottom-4 left-5 right-5 truncate font-display text-3xl font-semibold">
                        {shortName(t.destination)}
                      </div>
                    </div>
                    <div className="space-y-1.5 p-5 text-sm text-ink-soft">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-ink-muted" /> {formatRange(t.startDate, t.endDate)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Route className="size-4 text-ink-muted" />
                        <span className="truncate">
                          from {shortName(t.origin)}
                          {t.snapshot && ` · ${Math.round(t.snapshot.distanceKm).toLocaleString()} km`}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      if (t.id !== undefined && confirm(`Delete trip to ${shortName(t.destination)}?`)) void db.trips.delete(t.id)
                    }}
                    aria-label="Delete trip"
                    className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/25 text-white opacity-0 backdrop-blur transition hover:bg-rose-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
