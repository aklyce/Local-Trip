// Public holidays on the trip dates (FR-8). Nationwide holidays are plain; regional ones get a badge.
import { PartyPopper } from 'lucide-react'
import { formatShort, formatWeekday } from '../lib/dates'
import type { Holiday } from '../types'
import { EmptyState } from './Card'

export default function HolidaysPanel({ holidays }: { holidays: Holiday[] }) {
  if (holidays.length === 0) {
    return (
      <EmptyState icon={PartyPopper}>
        No public holidays during your trip — businesses should keep regular hours.
      </EmptyState>
    )
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-line pl-6">
      {holidays.map((h) => (
        <li key={h.date + h.name} className="relative">
          <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-sun ring-4 ring-white" />
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {formatWeekday(h.date)} · {formatShort(h.date)}
          </div>
          <div className="flex flex-wrap items-center gap-2 font-semibold text-ink">
            {h.name}
            {h.regional && (
              <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-line">
                Some regions only
              </span>
            )}
          </div>
          {h.localName !== h.name && <div className="text-sm text-ink-muted">{h.localName}</div>}
        </li>
      ))}
      <li className="text-sm text-ink-muted">Shops, banks and transit may run on reduced schedules.</li>
    </ol>
  )
}
