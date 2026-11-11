// Ticketmaster event cards (FR-7): name, date, venue, category, image and an external ticket link.
import { ArrowUpRight, CalendarX, MapPin, Ticket } from 'lucide-react'
import { formatShort, formatWeekday } from '../lib/dates'
import type { EventItem } from '../types'
import { EmptyState } from './Card'

export default function EventsPanel({ events }: { events: EventItem[] }) {
  if (events.length === 0) return <EmptyState icon={CalendarX}>No Ticketmaster events found within 50 km of your destination on your trip dates.</EmptyState>

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <li key={e.id}>
          <a
            href={e.url}
            target="_blank"
            rel="noreferrer"
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="relative aspect-video bg-gradient-to-br from-accent to-ink">
              {e.image ? (
                <img src={e.image} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <Ticket className="absolute inset-0 m-auto size-10 text-white/40" />
              )}
              <div className="absolute left-3 top-3 rounded-xl bg-white/95 px-2.5 py-1 text-center shadow-sm">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">{formatWeekday(e.date)}</div>
                <div className="text-sm font-bold leading-tight text-ink">{formatShort(e.date)}</div>
              </div>
              {e.category && (
                <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  {e.category}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="line-clamp-2 font-semibold leading-snug text-ink group-hover:text-accent">{e.name}</h3>
              <div className="mt-auto flex items-center justify-between gap-2 text-sm text-ink-muted">
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{e.venue ?? 'Venue TBA'}</span>
                  {e.time && <span className="shrink-0">· {e.time}</span>}
                </span>
                <ArrowUpRight className="size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
