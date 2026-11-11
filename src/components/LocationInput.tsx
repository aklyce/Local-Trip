import type { LucideIcon } from 'lucide-react'
import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { searchPlaces } from '../api/geocode'
import type { Place } from '../types'

interface Props {
  label: string
  icon: LucideIcon
  value: Place | null
  onChange: (place: Place | null) => void
}

const DEBOUNCE_MS = 300

export default function LocationInput({ label, icon: Icon, value, onChange }: Props) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const showResults = open && results.length > 0 && query.trim().length >= 2 && query !== value?.name

  useEffect(() => {
    // Don't search again once the text matches the selected place.
    if (query.trim().length < 2 || query === value?.name) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((places) => {
          setResults(places)
          setOpen(true)
        })
        .catch(() => {}) // aborted or network error: just show nothing
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, value?.name])

  return (
    <label className="relative block rounded-2xl px-4 py-3 transition focus-within:bg-paper hover:bg-paper">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <Icon className="size-3.5" />
        {label}
      </span>
      <input
        className="mt-1 w-full truncate bg-transparent text-base font-medium text-ink placeholder:font-normal placeholder:text-ink-muted/70 focus:outline-none"
        value={query}
        placeholder="City or place"
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(null)
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {showResults && (
        <ul className="absolute left-0 top-full z-[1000] mt-2 w-full min-w-72 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-2xl">
          {results.map((place) => (
            <li key={`${place.lat},${place.lon}`}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-paper"
                onClick={() => {
                  onChange(place)
                  setQuery(place.name)
                  setOpen(false)
                }}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{place.name.split(',')[0]}</span>
                  <span className="block text-xs text-ink-muted">{place.name.split(',').slice(1).join(',').trim()}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
