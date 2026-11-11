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
          <div className="font-semibold text-ink">{h.name}</div>
          {h.localName !== h.name && <div className="text-sm text-ink-muted">{h.localName}</div>}
        </li>
      ))}
      <li className="text-xs text-ink-muted">Shops, banks and transit may run on reduced schedules.</li>
    </ol>
  )
}
