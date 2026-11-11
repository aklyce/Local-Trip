// Discover filter bar (PRD v2 VIS-5): search, category chips, distance and Surprise me
// in one region. Selected chips get a pale fill *and* a check mark, not color alone.
import { Check, Search, Shuffle, X } from 'lucide-react'
import { CATEGORY_LABELS, type DestinationCategory } from '../data/destinations'
import { DISTANCE_OPTIONS, type DiscoverFilters as Filters } from '../lib/discover'

interface Props {
  filters: Filters
  onChange: (next: Filters) => void
  onSurprise: () => void
  surpriseDisabled: boolean
}

const CATEGORIES: (DestinationCategory | null)[] = [null, 'city', 'water', 'outdoors']

export default function DiscoverFilters({ filters, onChange, onSurprise, surpriseDisabled }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <div
      role="search"
      aria-label="Filter destinations"
      className="grid gap-3 rounded-3xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(23,28,41,0.04)] lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center"
    >
      <label className="relative block">
        <span className="sr-only">Search destinations</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder="Search by city, scenery, or vibe"
          className="w-full rounded-2xl border border-line bg-paper py-3 pl-10 pr-10 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:bg-white focus:outline-none focus:ring-3 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => set({ query: '' })}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-line/60 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </label>

      <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const selected = filters.category === c
          return (
            <button
              key={c ?? 'all'}
              type="button"
              aria-pressed={selected}
              onClick={() => set({ category: c })}
              className={`flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                selected ? 'border-accent/30 bg-accent-soft text-accent-strong' : 'border-transparent text-ink-soft hover:bg-paper hover:text-ink'
              }`}
            >
              {selected && <Check className="size-3.5" aria-hidden />}
              {c ? CATEGORY_LABELS[c] : 'All'}
            </button>
          )
        })}
      </div>

      <label className="block">
        <span className="sr-only">Distance from Berkeley</span>
        <select
          value={filters.maxKm ?? ''}
          onChange={(e) => set({ maxKm: e.target.value ? Number(e.target.value) : null })}
          className="w-full rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm font-medium text-ink focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 lg:w-auto"
        >
          <option value="">Any distance</option>
          {DISTANCE_OPTIONS.map((km) => (
            <option key={km} value={km}>
              Under {km} km
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onSurprise}
        disabled={surpriseDisabled}
        className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-ink/30"
      >
        <Shuffle className="size-4" /> Surprise me
      </button>
    </div>
  )
}
