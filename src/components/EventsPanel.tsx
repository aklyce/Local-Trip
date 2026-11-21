// Ticketmaster events as ticket stubs (FR-7): a cobalt date stub on the left (weekday, big day
// number, month), a perforated tear line, then name, venue, time and category. The whole ticket
// is the external link. The design doesn't depend on the event image; when Ticketmaster has one
// it shows as a small thumbnail on wider screens.
import { ArrowUpRight, CalendarX, Clock, MapPin } from 'lucide-react'
import { Chip } from '@/components/base/badges/chip'
import { formatWeekday } from '../lib/dates'
import type { EventItem } from '../types'
import { EmptyState } from './Card'

/** "19:30" → "7:30 PM" (US audience; Ticketmaster gives venue-local 24-hour times). */
function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** "2026-11-27" → { day: 27, month: "Nov" }, read as a local calendar date. */
function dateParts(iso: string): { day: number; month: string } {
  const [y, m, d] = iso.split('-').map(Number)
  return { day: d, month: new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short' }) }
}

export default function EventsPanel({ events }: { events: EventItem[] }) {
  if (events.length === 0) return <EmptyState icon={CalendarX}>No Ticketmaster events found within 31 mi of your destination on your trip dates.</EmptyState>

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {events.map((e) => {
        const { day, month } = dateParts(e.date)
        return (
          <li key={e.id} className="min-w-0">
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="group relative flex h-full min-h-28 overflow-hidden rounded-2xl bg-background-secondary-default outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              {/* Date stub */}
              <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-accent-600 py-3 text-white">
                <span className="text-body-medium text-white/80">{formatWeekday(e.date)}</span>
                <span className="font-display text-display-2-bold leading-none tracking-tight tabular-nums">{day}</span>
                <span className="text-body-medium text-white/80">{month}</span>
              </div>

              {/* Tear line: two notches in the card's own colour, joined by a dashed line. */}
              <span aria-hidden className="absolute -top-2 left-24 size-4 -translate-x-1/2 rounded-full bg-background-primary-default" />
              <span aria-hidden className="absolute -bottom-2 left-24 size-4 -translate-x-1/2 rounded-full bg-background-primary-default" />

              <div className="flex min-w-0 flex-1 items-center gap-4 border-l-2 border-dashed border-border-button-hover py-3 pl-5 pr-4">
                <div className="min-w-0 flex-1">
                  {e.category && (
                    <Chip color="neutral" variant="caption" className="mb-1.5">
                      {e.category}
                    </Chip>
                  )}
                  <h3 className="line-clamp-2 font-display text-title-3-semibold tracking-tight text-text-primary">{e.name}</h3>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-regular text-text-secondary">
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{e.venue ?? 'Venue to be announced'}</span>
                    </span>
                    {e.time && (
                      <span className="flex shrink-0 items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />
                        {formatTime12(e.time)}
                      </span>
                    )}
                  </p>
                </div>
                {e.image && (
                  <img src={e.image} alt="" loading="lazy" className="hidden size-20 shrink-0 rounded-xl object-cover sm:block" />
                )}
                <ArrowUpRight
                  className="size-5 shrink-0 text-foreground-icon-tertiary transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-600"
                  aria-hidden
                />
                <span className="sr-only">Tickets on Ticketmaster (opens in a new tab)</span>
              </div>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
