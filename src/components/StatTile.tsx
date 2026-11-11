import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  detail?: ReactNode
  icon: LucideIcon
  /** The one headline number on the page gets the large treatment. */
  hero?: boolean
}

export default function StatTile({ label, value, detail, icon: Icon, hero = false }: Props) {
  return (
    <div
      className={`flex flex-col justify-between rounded-3xl border border-line bg-white p-5 shadow-[0_8px_30px_rgba(20,33,61,0.06)] ${
        hero ? 'col-span-2' : ''
      }`}
    >
      <div className="flex items-center justify-between text-sm font-medium text-ink-soft">
        {label}
        <Icon className="size-4 text-ink-muted" />
      </div>
      <div className={`mt-3 font-semibold tracking-tight text-ink ${hero ? 'text-5xl' : 'text-3xl'}`}>{value}</div>
      {detail && <div className="mt-1 text-sm text-ink-muted">{detail}</div>}
    </div>
  )
}
