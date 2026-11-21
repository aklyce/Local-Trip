// Public holidays on the trip dates (FR-8). Nationwide holidays are plain; regional ones get a badge.
import { PartyPopper } from 'lucide-react'
import { Chip } from '@/components/base/badges/chip'
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
    <ol className="relative space-y-5 border-l-2 border-border-button-default pl-6">
      {holidays.map((h) => (
        <li key={h.date + h.name} className="relative">
          <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-status-yellow-text ring-4 ring-background-primary-default" />
          <div className="text-caption-1-semibold uppercase text-text-secondary">
            {formatWeekday(h.date)} · {formatShort(h.date)}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-body-semibold text-text-primary">
            {h.name}
            {h.regional && (
              <Chip color="soft" variant="caption">Some regions only</Chip>
            )}
          </div>
          {h.localName !== h.name && <div className="text-body-regular text-text-secondary">{h.localName}</div>}
        </li>
      ))}
      <li className="text-body-regular text-text-secondary">Shops, banks and transit may run on reduced schedules.</li>
    </ol>
  )
}
