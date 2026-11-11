// Discover (#/) — the entry page (PRD v2 §4, DISC-1 to DISC-5).
// Editorial hero, filter bar and curated destination cards. Every planning action opens
// the shared PlanTripDialog; nothing here creates a trip directly.
import { ArrowRight, Compass, MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import DestinationCard from '../components/DestinationCard'
import DiscoverFilters from '../components/DiscoverFilters'
import { DESTINATIONS, DISCOVER_ORIGIN } from '../data/destinations'
import { filterDestinations, type DiscoverFilters as Filters } from '../lib/discover'
import { usePlanTrip } from '../lib/planTrip'

const NO_FILTERS: Filters = { query: '', category: null, maxKm: null }

export default function DiscoverPage() {
  const planTrip = usePlanTrip()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const results = useMemo(() => filterDestinations(DESTINATIONS, DISCOVER_ORIGIN, filters), [filters])

  // DISC-5: pick only from what is currently visible, then open the dialog (never auto-create).
  function surprise() {
    if (results.length === 0) return
    const pick = results[Math.floor(Math.random() * results.length)]
    planTrip(pick.place)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero: headline left, supporting text right (VIS-3) */}
      <section className="grid gap-8 pb-10 pt-12 sm:pt-16 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Less planning. More going.</p>
          <h1 className="mt-4 font-display text-6xl leading-[0.95] text-ink sm:text-8xl">
            Your next
            <br />
            <span className="text-accent">little escape.</span>
          </h1>
        </div>
        <div className="lg:pb-3">
          <div className="mb-4 h-px w-12 bg-ink-muted/50" />
          <p className="text-ink-soft">
            A weekend away. A new point of view. Find somewhere good, then bring your whole trip together.
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPin className="size-4" /> Starting from Berkeley, CA
          </p>
        </div>
      </section>

      <DiscoverFilters
        filters={filters}
        onChange={setFilters}
        onSurprise={surprise}
        surpriseDisabled={results.length === 0}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-ink-muted" aria-live="polite">
          <span className="font-semibold text-ink">
            {results.length} {results.length === 1 ? 'place' : 'places'}
          </span>{' '}
          to get away · Curated California inspiration
        </p>
        <button
          type="button"
          onClick={() => planTrip()}
          className="flex items-center gap-1 font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Somewhere else in mind? Plan it <ArrowRight className="size-4" />
        </button>
      </div>

      {results.length > 0 ? (
        <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((d) => (
            <li key={d.id} className="flex">
              <DestinationCard destination={d} onPlan={() => planTrip(d.place)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-4 py-14 text-center">
          <Compass className="size-7 text-ink-muted" strokeWidth={1.5} />
          <p className="text-ink-soft">No places match those filters.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => planTrip()}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              Plan a custom trip
            </button>
          </div>
        </div>
      )}

      {/* Closing call to action */}
      <section className="my-20 flex flex-col items-start justify-between gap-6 border-t border-line pt-12 sm:flex-row sm:items-end">
        <h2 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
          The good part is getting there.
          <br />
          <span className="text-accent">We’ll help with the details.</span>
        </h2>
        <button
          type="button"
          onClick={() => planTrip()}
          className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Make a plan <ArrowRight className="size-4" />
        </button>
      </section>
    </div>
  )
}
