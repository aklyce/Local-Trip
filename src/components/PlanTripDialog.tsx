// The one shared "Plan a trip" form (PRD v2 §4, FR-1 to FR-4, DISC-4).
// Opened from Discover cards (destination preselected), Surprise me, and the global
// "Plan a trip" buttons. Split panel: a live route summary on the left, the form on the right. BoardUI Modal (React Aria): Escape / backdrop close, focus trap
// and focus restoration.
// The trip is saved to IndexedDB *before* navigating; on a storage failure the form stays open.
import { ArrowDown, ArrowRight } from 'lucide-react'
import { Heading } from 'react-aria-components'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/base/buttons/button'
import { HintText } from '@/components/base/input/hint-text'
import { InputBase, TextField } from '@/components/base/input/input'
import { Label } from '@/components/base/input/label'
import { CloseButton } from '@/components/base/buttons/close-button'
import { Modal, ModalBody, ModalFooter } from '@/components/base/modal/modal'
import { SpinnerGlyph } from '@/components/base/spinner/spinner'
import { cx } from '@/utils/cx'
import { haversineKm } from '../api/distance'
import { DISCOVER_ORIGIN } from '../data/destinations'
import { db } from '../db'
import { mergeSuggestions, suggestLabels } from '../lib/checklist'
import { addDays, daysBetween, today } from '../lib/dates'
import { FIELD, shortName } from '../lib/style'
import { mi } from '../lib/transport'
import type { ParsedTrip } from '../lib/tripParser'
import type { Place } from '../types'
import { Notice } from './Card'
import LocationInput from './LocationInput'
import TopoArt from './TopoArt'
import TripPromptBox from './TripPromptBox'

export interface PlanRequest {
  /** Changes on every open so the form starts fresh. */
  key: number
  destination?: Place
  /** Natural-language request typed on Discover; parsed when the form opens. */
  prompt?: string
}

interface Props {
  request: PlanRequest | null
  onClose: () => void
}

export default function PlanTripDialog({ request, onClose }: Props) {
  return (
    <Modal
      isOpen={request !== null}
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      className="relative gap-0 border-0 p-0 md:flex-row"
    >
      {({ close }) =>
        request && (
          <PlanForm
            key={request.key}
            initialDestination={request.destination}
            initialPrompt={request.prompt}
            onDone={close}
          />
        )
      }
    </Modal>
  )
}

function PlanForm({
  initialDestination,
  initialPrompt,
  onDone,
}: {
  initialDestination?: Place
  initialPrompt?: string
  onDone: () => void
}) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  // DISC-4: origin defaults to Berkeley; both cities stay editable.
  const [origin, setOrigin] = useState<Place | null>(DISCOVER_ORIGIN)
  const [destination, setDestination] = useState<Place | null>(initialDestination ?? null)
  const [startDate, setStartDate] = useState(addDays(today(), 7))
  const [endDate, setEndDate] = useState(addDays(today(), 9))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Bumped after the text box fills the form, so the city inputs remount and show the new names.
  const [fillCount, setFillCount] = useState(0)

  // With a destination preselected, start on the departure date; otherwise on "Heading to".
  useEffect(() => {
    const id = requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
    return () => cancelAnimationFrame(id)
  }, [])

  // Model result → the same state the user would set by hand. Missing fields stay unchanged.
  function applyParsed(trip: ParsedTrip) {
    if (trip.origin) setOrigin(trip.origin)
    if (trip.destination) setDestination(trip.destination)
    if (trip.startDate) setStartDate(trip.startDate)
    if (trip.endDate) setEndDate(trip.endDate)
    setFillCount((n) => n + 1)
  }

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
      onDone()
      navigate(`/trip/${id}`)
    } catch {
      setSaveError('Couldn’t save this trip in your browser’s storage. Check that site data is allowed, then try again.')
      setSaving(false)
    }
  }

  const miles = origin && destination && !sameCity ? mi(haversineKm(origin, destination)) : null
  // The contour art follows the destination, so the panel redraws when you pick a place.
  const artSeed = destination?.name ?? 'Plan a trip'

  return (
    <>
      {/* Left: live trip summary on the cobalt field. It fills in as the form does. */}
      <aside className={cx('relative isolate flex shrink-0 flex-col overflow-hidden p-6 md:w-[300px] md:p-7', FIELD.trip)}>
        <TopoArt key={artSeed} seed={artSeed} peaks={3} rings={12} animate className="-z-10 opacity-35" />
        <Heading slot="title" className="font-display text-display-4-bold leading-none tracking-tight md:text-display-2-bold">
          Plan a trip
        </Heading>

        {/* Phones: one compact line. */}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-body-medium text-white/90 md:hidden">
          {origin ? shortName(origin) : 'Somewhere'}
          <ArrowRight className="size-4" aria-hidden />
          {destination ? shortName(destination) : 'somewhere new'}
          {miles && <span className="text-white/70">{miles}</span>}
        </p>

        {/* Desktop: stacked route with the distance and length as large numerals. */}
        <div className="mt-auto hidden pt-10 md:block">
          <p className="text-body-medium text-white/70">From</p>
          <p className="text-place">{origin ? shortName(origin) : 'Choose a start'}</p>
          <ArrowDown className="my-3 size-5 text-white/70" aria-hidden />
          <p className="text-body-medium text-white/70">To</p>
          <p className="text-place">{destination ? shortName(destination) : 'Somewhere new'}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-white/25 pt-5">
            <div>
              <dd className="font-display text-title-1-bold tabular-nums">{miles ?? '–'}</dd>
              <dt className="text-body-regular text-white/70">straight line</dt>
            </div>
            <div>
              <dd className="font-display text-title-1-bold tabular-nums">
                {days !== null ? `${days} ${days === 1 ? 'day' : 'days'}` : '–'}
              </dd>
              <dt className="text-body-regular text-white/70">trip length</dt>
            </div>
          </dl>
        </div>
      </aside>

      {/* Right: the form. Only the fields scroll; the actions stay in view. */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 pb-6 pt-6 md:pt-14">
        <ModalBody className="space-y-4 py-1">
          {/* Free-text first: focused on open unless a Discover card already chose the destination. */}
          <TripPromptBox initialText={initialPrompt} autoFocus={!initialDestination} onParsed={applyParsed} />
          <LocationInput key={`o${fillCount}`} label="Leaving from" value={origin} onChange={setOrigin} />
          <LocationInput
            key={`d${fillCount}`}
            label="Heading to"
            value={destination}
            onChange={setDestination}
            placeholder="Where to?"
            autoFocus={!initialDestination}
          />
          {sameCity && <Notice tone="error">Origin and destination need to be different places.</Notice>}

          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              label="Departure"
              value={startDate}
              autoFocus={!!initialDestination}
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
          {saveError && <Notice tone="error">{saveError}</Notice>}
        </ModalBody>
        <ModalFooter className="sm:justify-between">
          <span className="hidden text-body-regular text-text-tertiary sm:block">Saved in this browser. No account needed.</span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="secondary" onClick={onDone}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              aria-busy={saving || undefined}
              trailingIcon={saving ? BusyGlyph : ArrowRight}
            >
              {saving ? 'Saving…' : 'Create trip'}
            </Button>
          </div>
        </ModalFooter>
      </form>

      <CloseButton size="md" aria-label="Close" onClick={onDone} className="absolute right-3 top-3 bg-background-primary-default shadow-xs" />
    </>
  )
}

function BusyGlyph({ className }: { className?: string }) {
  return <SpinnerGlyph size="sm" className={`${className ?? ''} text-current`} />
}

/** Native date input inside BoardUI's field shell (label, invalid state, hint). */
function DateField({
  label,
  value,
  min,
  error,
  autoFocus,
  onChange,
}: {
  label: string
  value: string
  min?: string
  error?: string
  /** Focused when the dialog opens (a card already chose the destination). */
  autoFocus?: boolean
  onChange: (value: string) => void
}) {
  return (
    <TextField value={value} onChange={onChange} isInvalid={!!error} isRequired className="flex flex-col gap-1">
      <Label isInvalid={!!error}>{label}</Label>
      <InputBase type="date" min={min} data-autofocus={autoFocus || undefined} />
      {error && <HintText isInvalid>{error}</HintText>}
    </TextField>
  )
}
