// Packing list card on the trip dashboard (PRD v2 FR-15 to FR-18).
// Users tick, add and remove items; every change is saved to IndexedDB immediately and a
// storage failure is shown in the card. It renders from the trip alone, so it stays usable
// while API data is loading or after an API fails (FR-11).
import { AlertCircle, ListChecks, Plus, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { editTrip } from '../db'
import { checklistProgress, dismissKey, formatProgress, hasLabel, newItem } from '../lib/checklist'
import type { ChecklistItem, Trip } from '../types'
import { Card } from './Card'

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

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Card title="Packing list" icon={ListChecks} subtitle={formatProgress(progress)}>
      <div
        role="progressbar"
        aria-label="Packing progress"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.done}
        aria-valuetext={formatProgress(progress)}
        className="-mt-2 mb-5 h-2 overflow-hidden rounded-full bg-paper"
      >
        <div className="h-full rounded-full bg-accent transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>

      {saveError && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {saveError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
          Your list is empty. Add the first thing you don’t want to forget.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="group flex items-center gap-3 py-2.5">
              <input
                id={`item-${item.id}`}
                type="checkbox"
                checked={item.done}
                onChange={() => void toggle(item)}
                className="size-5 shrink-0 cursor-pointer accent-accent"
              />
              <label
                htmlFor={`item-${item.id}`}
                className={`flex-1 cursor-pointer text-[15px] ${item.done ? 'text-ink-muted line-through' : 'text-ink'}`}
              >
                {item.label}
              </label>
              {item.auto && (
                <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-sm font-medium text-accent-strong">
                  <Sparkles className="size-3" aria-hidden /> Suggested
                </span>
              )}
              <button
                type="button"
                onClick={() => void remove(item)}
                aria-label={`Remove ${item.label}`}
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4">
        <div className="flex gap-2">
          <label htmlFor="new-item" className="sr-only">
            Add an item
          </label>
          <input
            id="new-item"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (inputError) setInputError(null)
            }}
            placeholder="Add an item, e.g. Hiking boots"
            aria-invalid={!!inputError || undefined}
            aria-describedby={inputError ? 'new-item-error' : undefined}
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Plus className="size-4" /> Add
          </button>
        </div>
        {inputError && (
          <p id="new-item-error" className="mt-1.5 text-sm text-rose-700">
            {inputError}
          </p>
        )}
      </form>

      {!hasForecast && (
        <p className="mt-4 text-sm text-ink-muted">
          Weather-based suggestions (umbrella, jacket, sunscreen) are added once your trip is within the 16-day forecast.
          Last year’s weather isn’t used for advice.
        </p>
      )}
    </Card>
  )
}
