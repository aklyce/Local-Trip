// Dashboard card shells. ServiceCard renders one external service's cached state:
// loading skeleton, data (with a "stale" notice if the last refresh failed), or an
// error / timeout / not-configured message with a useful next action (FR-10, FR-11).
import { AlertCircle, Info, Loader2, RotateCw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatUpdated } from '../lib/dates'
import type { ServiceState } from '../types'

interface CardProps {
  title: string
  icon?: LucideIcon
  subtitle?: ReactNode
  /** Right side of the header, e.g. a loading spinner or a badge. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, icon: Icon, subtitle, action, className = '', children }: CardProps) {
  return (
    <section className={`rounded-3xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(23,28,41,0.04)] ${className}`}>
      <header className="mb-5 flex items-start gap-3">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icon className="size-5" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>
          {subtitle && <div className="mt-0.5 text-sm text-ink-muted">{subtitle}</div>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1 text-sm font-medium hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <RotateCw className="size-3.5" /> Try again
    </button>
  )
}

/** Message box for a service that has no data to show. */
export function ServiceMessage<T>({ state, onRetry }: { state: ServiceState<T>; onRetry: () => void }) {
  if (state.status === 'unconfigured') {
    return (
      <div className="flex items-start gap-2 rounded-2xl bg-accent-soft p-4 text-sm text-accent-strong">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>{state.error} This isn’t an error with your trip.</span>
      </div>
    )
  }
  return (
    <div role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>
        {state.status === 'timeout' ? 'This is taking too long. ' : 'This service is unavailable right now. '}
        <span className="text-rose-700/80">{state.error}</span>
        <RetryButton onRetry={onRetry} />
      </div>
    </div>
  )
}

interface ServiceCardProps<T> extends Omit<CardProps, 'children'> {
  state?: ServiceState<T>
  loading: boolean
  onRetry: () => void
  children: (data: T) => ReactNode
}

export function ServiceCard<T>({ state, loading, onRetry, children, action, ...cardProps }: ServiceCardProps<T>) {
  const hasData = state?.data !== undefined
  const stale = hasData && state.status !== 'ok' && !loading

  return (
    <Card
      {...cardProps}
      action={
        loading && hasData ? (
          <span className="flex items-center gap-1.5 text-sm text-ink-muted" role="status">
            <Loader2 className="size-4 animate-spin" /> Updating
          </span>
        ) : (
          action
        )
      }
    >
      {hasData ? (
        <>
          {stale && (
            <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
              <strong className="font-semibold">Saved data from {formatUpdated(state.fetchedAt!)}.</strong> The latest refresh
              didn’t work ({state.status === 'timeout' ? 'timed out' : state.error?.replace(/\.$/, '')}).
              <RetryButton onRetry={onRetry} />
            </div>
          )}
          {children(state.data as T)}
          {state.fetchedAt && !stale && <p className="mt-4 text-sm text-ink-muted">Updated {formatUpdated(state.fetchedAt)}</p>}
        </>
      ) : loading || !state ? (
        <div aria-busy="true" className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-paper" />
          <div className="h-24 animate-pulse rounded-2xl bg-paper" />
          <p className="flex items-center gap-1.5 text-sm text-ink-muted" role="status">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        </div>
      ) : (
        <ServiceMessage state={state} onRetry={onRetry} />
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
