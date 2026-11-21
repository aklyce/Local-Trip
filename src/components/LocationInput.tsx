// City autocomplete (FR-1) on BoardUI's ComboBox (React Aria: listbox, arrow keys, Enter to pick,
// Escape closes only the list). Searches Photon after 3 characters with a 350 ms debounce.
// A place only counts as selected once the user picks a suggestion; typing clears it.
// If Photon is down, matching curated places are offered instead so the demo still works.
import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ComboBox, ComboBoxItem } from '@/components/base/combobox/combobox'
import { Spinner } from '@/components/base/spinner/spinner'
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
type Option = { id: string; place: Place }

const keyOf = (p: Place) => `${p.name}|${p.lat},${p.lon}`

export default function LocationInput({ label, value, onChange, placeholder = 'City or place', autoFocus }: Props) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [focused, setFocused] = useState(false)

  const searching = query.trim().length >= MIN_CHARS && query !== value?.name

  useEffect(() => {
    // Don't search again once the text matches the selected place.
    if (!searching) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setStatus('loading')
      searchPlaces(query, controller.signal)
        .then((places) => {
          setResults(places)
          setStatus('done')
        })
        .catch(() => {
          if (controller.signal.aborted) return
          // Outage fallback: offer curated places whose name matches.
          const q = query.trim().toLowerCase()
          setResults(CURATED_PLACES.filter((p) => p.name.toLowerCase().includes(q)))
          setStatus('error')
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, searching])

  // The selected place always stays in the collection, so React Aria keeps showing its name.
  const items = useMemo<Option[]>(() => {
    const list = (searching ? results : []).map((place) => ({ id: keyOf(place), place }))
    if (value && !list.some((o) => o.id === keyOf(value))) list.unshift({ id: keyOf(value), place: value })
    return list
  }, [results, searching, value])

  const needsPick = !focused && !value && query.trim().length > 0

  return (
    <ComboBox<Option>
      label={label}
      placeholder={placeholder}
      leadingIcon={MapPin}
      items={items}
      inputValue={query}
      onInputChange={(text) => {
        setQuery(text)
        if (value && text !== value.name) onChange(null)
      }}
      selectedKey={value ? keyOf(value) : null}
      onSelectionChange={(key) => {
        const opt = items.find((o) => o.id === key)
        if (!opt) return
        onChange(opt.place)
        setQuery(opt.place.name)
      }}
      menuTrigger="input"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      isInvalid={needsPick}
      // PlanTripDialog focuses the field marked data-autofocus after the modal opens.
      autoFocus={autoFocus}
      hint={
        needsPick
          ? 'Choose a city from the suggestions.'
          : status === 'error' && searching
            ? 'City search is unavailable right now. Showing saved suggestions.'
            : undefined
      }
      emptyMessage={
        status === 'loading' ? (
          <span className="flex items-center gap-2">
            <Spinner size="sm" aria-hidden /> Searching…
          </span>
        ) : (
          'No places found. Try a different spelling.'
        )
      }
    >
      {(opt) => {
        const [city, ...rest] = opt.place.name.split(',')
        return (
          <ComboBoxItem id={opt.id} textValue={opt.place.name}>
            <span className="min-w-0">
              <span className="block truncate text-body-medium text-text-primary">{city}</span>
              <span className="block truncate text-body-regular text-text-secondary">{rest.join(',').trim()}</span>
            </span>
          </ComboBoxItem>
        )
      }}
    </ComboBox>
  )
}
