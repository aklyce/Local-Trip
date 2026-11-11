import { AlertCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Section } from '../types'

interface CardProps {
  title: string
  icon?: LucideIcon
  subtitle?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, icon: Icon, subtitle, className = '', children }: CardProps) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(20,33,61,0.04)] ${className}`}>
      <header className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-5" strokeWidth={2} />
          </span>
        )}
        <div>
          <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

/** Renders a section's data, or its error message if that API call failed. */
export function SectionCard<T>({
  section,
  children,
  ...cardProps
}: Omit<CardProps, 'children'> & {
  section: Section<T>
  children: (data: T) => ReactNode
}) {
  return (
    <Card {...cardProps}>
      {section.ok ? (
        children(section.data)
      ) : (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{section.error}</span>
        </div>
      )}
    </Card>
  )
}

export function EmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
      <Icon className="size-6" strokeWidth={1.5} />
      {children}
    </div>
  )
}
