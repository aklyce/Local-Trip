// Discover (#/) — the entry page (PRD v2 §4, DISC-1 to DISC-5).
// Short header, filter bar and curated destination cards. Every planning action opens
// the shared PlanTripDialog; nothing here creates a trip directly.
import { ArrowRight, Compass, MapPin, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/base/buttons/button'
import { LinkButton } from '@/components/base/buttons/link-button'
import { TextField } from '@/components/base/input/input'
import { TextareaBase } from '@/components/base/textarea/textarea'
import { EmptyState } from '../components/Card'
import TopoArt from '../components/TopoArt'
import DestinationCard from '../components/DestinationCard'
import DiscoverFilters from '../components/DiscoverFilters'
import { DESTINATIONS, DISCOVER_ORIGIN } from '../data/destinations'
import { filterDestinations, type DiscoverFilters as Filters } from '../lib/discover'
import { usePlanTrip } from '../lib/planTrip'
import { groqConfigured } from '../api/groq'
import { checkSupport } from '../lib/tripParser'

// Clicking one fills the composer; nothing is sent until the user presses Plan it.
const EXAMPLES = ['Monterey this weekend', 'Lake Tahoe for 3 days next month', 'Los Angeles, Dec 12 to 14']

const NO_FILTERS: Filters = { query: '', category: null, maxMi: null }

export default function DiscoverPage() {
  const planTrip = usePlanTrip()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [prompt, setPrompt] = useState('')
  // Show the free-text box only where a model can run: Groq configured, or a usable WebGPU.
  const [canAsk, setCanAsk] = useState(groqConfigured)
  useEffect(() => {
    let live = true
    void checkSupport().then((s) => live && setCanAsk(groqConfigured() || s.ok))
    return () => {
      live = false
    }
  }, [])
  const results = useMemo(() => filterDestinations(DESTINATIONS, DISCOVER_ORIGIN, filters), [filters])

  // DISC-5: pick only from what is currently visible, then open the dialog (never auto-create).
  function surprise() {
    if (results.length === 0) return
    const pick = results[Math.floor(Math.random() * results.length)]
    planTrip(pick.place)
  }

  // Natural-language search: hand the sentence to the plan dialog, which runs WebLLM on it.
  function askTrip(e: FormEvent) {
    e.preventDefault()
    if (prompt.trim()) planTrip(undefined, prompt.trim())
  }

  return (
    <>
      {/* Hero: a full-width cobalt field with contour lines that draw in once. The "describe your
          trip" composer is the main way in, so it sits large and centred on top. */}
      <header className="relative isolate overflow-hidden bg-accent-600 text-white">
        <TopoArt seed="Berkeley to anywhere" peaks={4} rings={11} animate className="-z-10 opacity-30" />
        <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 text-center sm:px-6 sm:pb-24 sm:pt-36">
          <h1 className="text-poster">Where to next?</h1>
          <p className="mx-auto mt-5 max-w-md text-headline-regular text-white/85">
            {canAsk
              ? 'Say it in a sentence. We’ll fill in the plan with weather, events, the route and a packing list.'
              : 'Pick a place and your dates. We’ll add the weather, events, the route and a packing list.'}
          </p>

          {/* Hidden without a usable model; the filters and "Plan trip" buttons below still work everywhere. */}
          {canAsk ? (
            <>
              <form
                onSubmit={askTrip}
                role="search"
                aria-label="Describe your trip"
                className="mx-auto mt-9 max-w-2xl rounded-3xl bg-background-primary-default p-4 text-left shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45)] ring-1 ring-white/20 sm:p-5"
              >
                <TextField
                  aria-label="Describe your trip"
                  value={prompt}
                  onChange={setPrompt}
                  fieldClassName="rounded-none bg-transparent p-0 ring-0"
                  inputClassName="px-0 text-title-3-regular"
                >
                  <TextareaBase
                    rows={3}
                    autoResize
                    maxRows={6}
                    placeholder="San Francisco next weekend from LA, three days"
                    onKeyDown={(e) => {
                      // Enter sends, Shift+Enter makes a new line.
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        e.currentTarget.form?.requestSubmit()
                      }
                    }}
                  />
                </TextField>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-body-regular text-text-tertiary">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">From Berkeley, CA unless you say otherwise</span>
                  </span>
                  <Button type="submit" disabled={!prompt.trim()} leadingIcon={Sparkles}>
                    Plan it
                  </Button>
                </div>
              </form>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-body-medium text-white/80">Try</span>
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="cursor-pointer rounded-full border border-white/35 px-3 py-1 text-body-medium text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Button variant="secondary" className="mt-8" onClick={() => planTrip()}>
              Plan a trip
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6">
        <h2 className="mb-5 font-display text-display-4-semibold tracking-tight text-text-primary">Or start from a place</h2>

      <DiscoverFilters
        filters={filters}
        onChange={setFilters}
        onSurprise={surprise}
        surpriseDisabled={results.length === 0}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-regular text-text-secondary" aria-live="polite">
          <span className="text-body-semibold text-text-primary">
            {results.length} {results.length === 1 ? 'place' : 'places'}
          </span>{' '}
          · Curated California inspiration
        </p>
        <LinkButton onClick={() => planTrip()} trailingIcon={ArrowRight}>
          Somewhere else in mind?
        </LinkButton>
      </div>

      {results.length > 0 ? (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((d) => (
            <li key={d.id} className="flex">
              <DestinationCard destination={d} onPlan={() => planTrip(d.place)} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Compass}
          title="No places match"
          className="mt-4 py-14"
          actions={
            <>
              <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </Button>
              <Button onClick={() => planTrip()}>Plan a custom trip</Button>
            </>
          }
        >
          Try a different search or category, or plan a trip to anywhere you like.
        </EmptyState>
      )}
      </div>
    </>
  )
}
