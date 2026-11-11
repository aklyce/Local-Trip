// The one shared "Plan a trip" form (PRD v2 §4, FR-1 to FR-4, DISC-4).
// Opened from Discover cards (destination preselected), Surprise me, and the global
// "Plan a trip" buttons. Uses a native modal <dialog>, which gives us Escape to close,
// focus containment and focus restoration from the browser.
// The trip is saved to IndexedDB *before* navigating; on a storage failure the form stays open.
import { ArrowRight, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DISCOVER_ORIGIN } from '../data/destinations'
import { db } from '../db'
import { mergeSuggestions, suggestLabels } from '../lib/checklist'
import { addDays, daysBetween, today } from '../lib/dates'
import type { Place } from '../types'
import LocationInput from './LocationInput'

export interface PlanRequest {
  /** Changes on every open so the form starts fresh. */
  key: number
  destination?: Place
}

interface Props {
  request: PlanRequest | null
  onClose: () => void
}

export default function PlanTripDialog({ request, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  // Keep the native dialog's open state in sync with the request.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (request && !dialog.open) {
      dialog.showModal()
      // React's autoFocus runs before showModal(), so move focus to the marked field ourselves.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!request && dialog.open) dialog.close()
  }, [request])

  return (
    <dialog
      ref={ref}
      aria-labelledby="plan-trip-title"
      onClose={onClose}
      // Click on the dimmed backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-visible rounded-3xl bg-transparent p-0 text-ink backdrop:bg-ink/40"
    >
      {request && <PlanForm key={request.key} initialDestination={request.destination} onCancel={() => ref.current?.close()} />}
    </dialog>
  )
}

function PlanForm({ initialDestination, onCancel }: { initialDestination?: Place; onCancel: () => void }) {
  const navigate = useNavigate()
  // DISC-4: origin defaults to Berkeley; both cities stay editable.
  const [origin, setOrigin] = useState<Place | null>(DISCOVER_ORIGIN)
  const [destination, setDestination] = useState<Place | null>(initialDestination ?? null)
  const [startDate, setStartDate] = useState(addDays(today(), 7))
  const [endDate, setEndDate] = useState(addDays(today(), 9))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // FR-2 / FR-3 validation. Dates are local calendar dates (YYYY-MM-DD), so string compare is safe.
  const startInPast = startDate !== '' && startDate < today()
  const endBeforeStart = startDate !== '' && endDate !== '' && endDate < startDate
  const sameCity = !!origin && !!destination && origin.lat === destination.lat && origin.lon === destination.lon
  const canSubmit = !!origin && !!destination && !!startDate && !!endDate && !startInPast && !endBeforeStart && !sameCity && !saving
  // Inclusive day count, e.g. Fri–Sun = 3 days.
  const days = startDate && endDate && !endBeforeStart ? daysBetween(startDate, endDate) + 1 : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || !origin || !destination) return
    setSaving(true)
    setSaveError(null)
    try {
      // Save first; the dashboard fetches API data and caches it on the trip.
      // The checklist starts with the non-weather suggestions; forecast items are added after the fetch.
      const basics = { origin, destination, startDate, endDate }
      const checklist = mergeSuggestions([], suggestLabels(basics))
      const id = await db.trips.add({ ...basics, checklist, createdAt: Date.now() })
      onCancel()
      navigate(`/trip/${id}`)
    } catch {
      setSaveError('Couldn’t save this trip in your browser’s storage. Check that site data is allowed, then try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close"
        className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <X className="size-5" />
      </button>

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Something to look forward to</p>
      <h2 id="plan-trip-title" className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
        Let’s get you <span className="text-accent">away.</span>
      </h2>
      <p className="mt-2 text-sm text-ink-soft">The place, the dates. We’ll bring the details together.</p>

      <div className="mt-6 space-y-4">
        <LocationInput label="Leaving from" value={origin} onChange={setOrigin} />
        <LocationInput
          label="Heading to"
          value={destination}
          onChange={setDestination}
          placeholder="Where to?"
          autoFocus={!initialDestination}
        />
        {sameCity && <p className="text-sm text-rose-700">Origin and destination need to be different places.</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            label="Departure"
            value={startDate}
            min={today()}
            onChange={setStartDate}
            error={startInPast ? 'Departure can’t be in the past.' : undefined}
          />
          <DateField
            label="Return"
            value={endDate}
            min={startDate || today()}
            onChange={setEndDate}
            error={endBeforeStart ? 'Return must be on or after departure.' : undefined}
          />
        </div>
        {days !== null && (
          <p className="text-sm text-ink-muted">
            {days} {days === 1 ? 'day' : 'days'}
          </p>
        )}
      </div>

      {saveError && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {saveError}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-6 flex w-full items-center justify-between rounded-xl bg-ink px-5 py-3.5 font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-ink/30"
      >
        {saving ? 'Saving your trip…' : 'Bring my trip together'}
        {saving ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
      </button>
      <p className="mt-3 text-center text-sm text-ink-muted">Saved in this browser. No account needed.</p>
    </form>
  )
}

function DateField({
  label,
  value,
  min,
  error,
  onChange,
}: {
  label: string
  value: string
  min?: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        required
        aria-invalid={!!error || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 aria-invalid:border-rose-400"
      />
      {error && <span className="mt-1.5 block text-sm text-rose-700">{error}</span>}
    </label>
  )
}
