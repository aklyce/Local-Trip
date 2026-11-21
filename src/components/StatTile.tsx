// One KPI tile on the trip dashboard, styled like BoardUI's Stat Cards (label, big number, detail).
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'
import TopoArt from './TopoArt'

interface Props {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon: LucideIcon
  /** The one headline number on the page spans two columns. */
  hero?: boolean
}

export default function StatTile({ label, value, detail, icon: Icon, hero = false }: Props) {
  return (
    <div
      className={cx(
        'relative isolate flex flex-col overflow-hidden rounded-3xl p-5',
        // The headline tile is filled dark, echoing the menu bar and footer.
        hero
          ? 'col-span-2 bg-neutral-950 text-white'
          : 'border border-border-button-default bg-background-primary-default text-text-primary',
      )}
    >
      {hero && <TopoArt seed={label} peaks={2} rings={9} className="-z-10 opacity-20" />}
      <div className={cx('flex items-center justify-between gap-2 text-body-medium', hero ? 'text-white/75' : 'text-text-secondary')}>
        {label}
        <Icon className={cx('size-4', hero ? 'text-white/60' : 'text-foreground-icon-tertiary')} aria-hidden />
      </div>
      <div className={cx('mt-3 font-display tabular-nums', hero ? 'text-display-1-bold tracking-tight' : 'text-title-1-semibold')}>{value}</div>
      {detail && <div className={cx('mt-1 text-body-regular', hero ? 'text-white/70' : 'text-text-secondary')}>{detail}</div>}
    </div>
  )
}
