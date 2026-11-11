// City autocomplete (FR-1). Searches Photon after 3 characters with a 350 ms debounce.
// A place only counts as selected once the user picks a suggestion; typing clears it.
// Keyboard: ↑/↓ move, Enter picks, Escape closes the list (without closing the dialog).
// If Photon is down, matching curated places are offered instead so the demo still works.
import { AlertCircle, Loader2, MapPin } from 'lucide-react'
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { searchPlaces } from '../api/geocode'
import { CURATED_PLACES } from '../data/destinations'
import type { Place } from '../types'

interface Props {
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
  placeholder?: string
  autoFocus?: boolean
}

const DEBOUNCE_MS = 350
const MIN_CHARS = 3

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function LocationInput({ label, value, onChange, placeholder = 'City or place', autoFocus }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)

  const searching = query.trim().length >= MIN_CHARS && query !== value?.name

  useEffect(() => {
    // Don't search again once the text matches the selected place.
    if (!searching) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setStatus('loading')
      setOpen(true)
      searchPlaces(query, controller.signal)
        .then((places) => {
          setResults(places)
          setActive(0)
          setStatus('done')
        })
        .catch(() => {
          if (controller.signal.aborted) return
          // Outage fallback: offer curated places whose name matches.
          const q = query.trim().toLowerCase()
          setResults(CURATED_PLACES.filter((p) => p.name.toLowerCase().includes(q)))
          setActive(0)
          setStatus('error')
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, searching])

  function pick(place: Place) {
    onChange(place)
    setQuery(place.name)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || !searching) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (results.length ? (i + step + results.length) % results.length : 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      // Close only the list; preventDefault stops the surrounding <dialog> from closing too.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
  }

  const showList = open && searching
  const needsPick = !focused && !value && query.trim().length > 0

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          aria-invalid={needsPick || undefined}
          autoComplete="off"
          // PlanTripDialog focuses this after opening (native autoFocus fires too early in a dialog).
          data-autofocus={autoFocus || undefined}
          className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-10 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            if (value) onChange(null)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setFocused(true)
            if (searching) setOpen(true)
          }}
          onBlur={() => {
            setFocused(false)
            // Delay so a click on a suggestion lands before the list closes.
            setTimeout(() => setOpen(false), 150)
          }}
        />
        {status === 'loading' && searching && (
          <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-muted" aria-hidden />
        )}
      </div>

      {needsPick && <p className="mt-1.5 text-sm text-rose-700">Choose a city from the suggestions.</p>}

      {showList && (
        <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          {status === 'loading' && <p className="px-4 py-3 text-sm text-ink-muted">Searching…</p>}
          {status === 'error' && (
            <p className="flex items-start gap-2 border-b border-line px-4 py-3 text-sm text-ink-soft">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              City search is unavailable right now.{results.length > 0 && ' Showing saved suggestions.'}
            </p>
          )}
          {status === 'done' && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-muted">No places found. Try a different spelling.</p>
          )}
          <ul id={listId} role="listbox" aria-label={`${label} suggestions`}>
            {status !== 'loading' &&
              results.map((place, i) => (
                <li
                  key={`${place.lat},${place.lon}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mousedown (not click) so it fires before the input blurs
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(place)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i === active ? 'bg-accent-soft' : ''}`}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{place.name.split(',')[0]}</span>
                    <span className="block text-sm text-ink-muted">{place.name.split(',').slice(1).join(',').trim()}</span>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
