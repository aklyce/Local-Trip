import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, CalendarDays, CloudSun, Flag, Navigation, PartyPopper, Search, Ticket } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LocationInput from '../components/LocationInput'
import { db } from '../db'
import { addDays, formatRange, today } from '../lib/dates'
import { placeGradient, shortName } from '../lib/style'
import type { Place } from '../types'

const FEATURES = [
  { icon: CloudSun, title: 'Weather outlook', text: '16-day forecast, or last year’s conditions for trips further out.' },
  { icon: Ticket, title: 'Local events', text: 'Concerts, games and shows happening near your destination.' },
  { icon: PartyPopper, title: 'Public holidays', text: 'Know when shops close and crowds peak before you go.' },
]

export default function PlanPage() {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [startDate, setStartDate] = useState(addDays(today(), 7))
  const [endDate, setEndDate] = useState(addDays(today(), 10))
  const recent = useLiveQuery(() => db.trips.orderBy('createdAt').reverse().limit(3).toArray(), [])

  const canSubmit = origin && destination && startDate && endDate && startDate <= endDate

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!origin || !destination) return
    // Save first; the dashboard page fetches the API data and stores it on the trip.
    const id = await db.trips.add({ origin, destination, startDate, endDate, createdAt: Date.now() })
    navigate(`/trip/${id}`)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(160deg,#0b3a53_0%,#14213d_55%,#1e1b4b_100%)]">
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-cyan-400/25 blur-3xl" />
          <div className="absolute -right-16 top-24 size-80 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-cyan-100 ring-1 ring-white/15">
            <Navigation className="size-3.5" /> Plan smarter, travel lighter
          </p>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] text-white sm:text-7xl">
            Where to <em className="text-amber-300">next</em>?
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Enter where you’re going and when. We’ll pull together the weather, events and holidays into one trip overview.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 grid gap-1 rounded-[28px] bg-white p-2 shadow-2xl shadow-black/30 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-center md:divide-x md:divide-line"
          >
            <LocationInput label="From" icon={Navigation} value={origin} onChange={setOrigin} />
            <LocationInput label="To" icon={Flag} value={destination} onChange={setDestination} />
            <DateField label="Depart" value={startDate} onChange={setStartDate} />
            <DateField label="Return" value={endDate} min={startDate} onChange={setEndDate} />
            <div className="p-1 md:border-none md:pl-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-accent px-6 py-4 font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Search className="size-5" /> Explore
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-3xl border border-line bg-white p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm text-ink-soft">{text}</p>
          </div>
        ))}
      </section>

      {/* Recent trips */}
      {recent && recent.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-3xl font-semibold text-ink">Recent trips</h2>
            <Link to="/history" className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recent.map((t) => (
              <Link
                key={t.id}
                to={`/trip/${t.id}`}
                className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-3xl p-5 text-white transition hover:-translate-y-0.5 hover:shadow-xl"
                style={{ background: placeGradient(t.destination.name) }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:18px_18px]" />
                <div className="relative">
                  <div className="font-display text-2xl font-semibold">{shortName(t.destination)}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                    <CalendarDays className="size-3.5" /> {formatRange(t.startDate, t.endDate)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function DateField({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: string
  min?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block rounded-2xl px-4 py-3 transition focus-within:bg-paper hover:bg-paper">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <CalendarDays className="size-3.5" />
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-transparent text-base font-medium text-ink focus:outline-none"
      />
    </label>
  )
}
