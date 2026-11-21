// Packing list card on the trip dashboard (PRD v2 FR-15 to FR-18).
// Users tick, add and remove items; every change is saved to IndexedDB immediately and a
// storage failure is shown in the card. It renders from the trip alone, so it stays usable
// while API data is loading or after an API fails (FR-11).
import { Check, ListChecks, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Chip } from '@/components/base/badges/chip'
import { Button } from '@/components/base/buttons/button'
import { CloseButton } from '@/components/base/buttons/close-button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Input } from '@/components/base/input/input'
import { cx } from '@/utils/cx'
import { editTrip } from '../db'
import { checklistProgress, dismissKey, formatProgress, hasLabel, newItem } from '../lib/checklist'
import { FIELD } from '../lib/style'
import type { ChecklistItem, Trip } from '../types'
import { Card, EmptyState, Notice } from './Card'
import TopoArt from './TopoArt'

interface Props {
  trip: Trip & { id: number }
  /** True when the cached weather is a real forecast (weather-based suggestions apply). */
  hasForecast: boolean
}

export default function ChecklistCard({ trip, hasForecast }: Props) {
  const items = trip.checklist ?? []
  const progress = checklistProgress(items)
  const [draft, setDraft] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Save a change against the latest stored trip; surface storage failures instead of hiding them.
  async function save(change: (list: ChecklistItem[], t: Trip) => Partial<Trip>) {
    try {
      await editTrip(trip.id, (t) => change(t.checklist ?? [], t))
      setSaveError(null)
    } catch {
      setSaveError('Couldn’t save your change in this browser’s storage. Please try again.')
    }
  }

  const toggle = (item: ChecklistItem) =>
    save((list) => ({ checklist: list.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) }))

  const remove = (item: ChecklistItem) =>
    save((list, t) => ({
      checklist: list.filter((i) => i.id !== item.id),
      // Remember removed suggestions so a data refresh doesn't bring them back.
      ...(item.auto ? { dismissedSuggestions: [...(t.dismissedSuggestions ?? []), dismissKey(item.label)] } : {}),
    }))

  async function add(e: FormEvent) {
    e.preventDefault()
    const label = draft.trim()
    if (!label) return setInputError('Type an item first.')
    if (hasLabel(items, label)) return setInputError(`“${label}” is already on your list.`)
    setInputError(null)
    setDraft('')
    await save((list) => ({ checklist: [...list, newItem(label, false)] }))
  }

  const allPacked = progress.total > 0 && progress.done === progress.total
  // One bar segment per item while they stay readable; a long list falls back to one continuous bar.
  const segmented = progress.total > 0 && progress.total <= 16

  return (
    <Card title="Packing list" icon={ListChecks} subtitle="Tick things off as you pack">
      {/* Progress panel: big count and a thick bar. When everything is ticked it turns cobalt and
          the contour lines draw in once — the card's one celebratory moment. */}
      <div
        className={cx(
          'relative isolate mb-5 overflow-hidden rounded-2xl p-4 transition-colors duration-500 sm:p-5',
          allPacked ? FIELD.trip : 'bg-background-secondary-default text-text-primary',
        )}
      >
        {allPacked && <TopoArt seed={`packed ${trip.destination.name}`} peaks={3} rings={10} animate className="-z-10 opacity-35" />}
        <div className="flex items-end justify-between gap-3">
          <p aria-hidden className="flex items-baseline gap-2 font-display tabular-nums">
            <span className="text-display-1-bold leading-none tracking-tight">{progress.done}</span>
            <span className={cx('text-title-2-semibold', allPacked ? 'text-white/75' : 'text-text-secondary')}>/ {progress.total} packed</span>
          </p>
          {allPacked && (
            <span className="pop-in flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-body-semibold text-accent-700">
              <Check className="size-4" strokeWidth={3} aria-hidden /> Ready to go
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Packing progress"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          aria-valuetext={formatProgress(progress)}
          className="mt-4 flex h-3 gap-1"
        >
          {segmented ? (
            items.map((item, i) => (
              <span
                key={item.id}
                className={cx(
                  'flex-1 rounded-full transition-colors duration-300',
                  i < progress.done ? (allPacked ? 'bg-white' : 'bg-accent-500') : allPacked ? 'bg-white/25' : 'bg-background-quaternary-default',
                )}
              />
            ))
          ) : (
            <span className={cx('flex-1 overflow-hidden rounded-full', allPacked ? 'bg-white/25' : 'bg-background-quaternary-default')}>
              <span
                className={cx('block h-full rounded-full transition-[width] duration-300', allPacked ? 'bg-white' : 'bg-accent-500')}
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </span>
          )}
        </div>
        {/* Announced once when the last item is ticked. */}
        <p aria-live="polite" className="sr-only">
          {allPacked ? 'Everything is packed. Ready to go.' : ''}
        </p>
      </div>

      {saveError && (
        <Notice tone="error" className="mb-4">
          {saveError}
        </Notice>
      )}

      {items.length === 0 ? (
        <EmptyState icon={ListChecks} className="py-8">
          Your list is empty. Add the first thing you don’t want to forget.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-separator-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <Checkbox isSelected={item.done} onChange={() => void toggle(item)} className="min-w-0 flex-1">
                <span className={item.done ? 'text-text-tertiary line-through' : undefined}>{item.label}</span>
              </Checkbox>
              {item.auto && (
                <Chip color="soft" variant="caption">
                  Suggested
                </Chip>
              )}
              <CloseButton size="sm" onClick={() => void remove(item)} aria-label={`Remove ${item.label}`} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 flex items-start gap-2">
        <Input
          aria-label="Add an item"
          value={draft}
          onChange={(value) => {
            setDraft(value)
            if (inputError) setInputError(null)
          }}
          placeholder="Add an item, e.g. Hiking boots"
          isInvalid={!!inputError}
          hint={inputError ?? undefined}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" leadingIcon={Plus}>
          Add
        </Button>
      </form>

      {!hasForecast && (
        <p className="mt-4 text-body-regular text-text-tertiary">
          Weather-based suggestions (umbrella, jacket, sunscreen) are added once your trip is within the 16-day forecast.
          Last year’s weather isn’t used for advice.
        </p>
      )}
    </Card>
  )
}
