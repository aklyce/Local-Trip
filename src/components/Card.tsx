// Dashboard card shells, built from BoardUI tokens and components (BoardUI has no generic card).
// ServiceCard renders one external service's cached state: loading skeleton, data (with a
// "stale" notice if the last refresh failed), or an error / timeout / not-configured message
// with a useful next action (FR-10, FR-11).
import { AlertCircle, Info, RotateCw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/base/buttons/button'
import { Skeleton, SkeletonText } from '@/components/base/skeleton/skeleton'
import { Spinner } from '@/components/base/spinner/spinner'
import { cx } from '@/utils/cx'
import TopoArt from './TopoArt'
import { formatUpdated } from '../lib/dates'
import type { ServiceState } from '../types'

interface CardProps {
  title: string
  icon?: LucideIcon
  subtitle?: ReactNode
  /** Right side of the header, e.g. a loading spinner or a chip. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Plain white panel: BoardUI's card recipe (rounded-3xl, button border). */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cx('rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6', className)}>
      {children}
    </section>
  )
}

export function Card({ title, icon: Icon, subtitle, action, className, children }: CardProps) {
  return (
    <Panel className={className}>
      {/* flex-wrap + a minimum text width: on phones a wide action chip drops below the title
          instead of squeezing the subtitle into a one-word-per-line column. */}
      <header className="mb-5 flex flex-wrap items-start gap-3">
        {Icon && <span className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-950 text-white">
            <Icon className="size-[18px]" aria-hidden />
          </span>}
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="font-display text-title-2-semibold tracking-tight text-text-primary">{title}</h2>
          {subtitle && <div className="mt-0.5 text-body-regular text-text-secondary">{subtitle}</div>}
        </div>
        {action}
      </header>
      {children}
    </Panel>
  )
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="secondary" size="small" leadingIcon={RotateCw} onClick={onRetry} className="mt-3">
      Try again
    </Button>
  )
}

/** Inline notice. `tone` picks BoardUI's notification colours. */
export function Notice({
  tone = 'info',
  icon: Icon = tone === 'error' ? AlertCircle : Info,
  className,
  children,
}: {
  tone?: 'info' | 'error' | 'warning'
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cx(
        'flex items-start gap-2 rounded-2xl p-3 text-body-regular',
        tone === 'error' && 'bg-notification-error-background text-text-primary',
        tone === 'warning' && 'bg-status-yellow-background text-status-yellow-text',
        tone === 'info' && 'bg-background-secondary-default text-text-secondary',
        className,
      )}
    >
      <Icon
        className={cx('mt-0.5 size-4 shrink-0', tone === 'error' ? 'text-notification-error-foreground' : 'text-foreground-icon-secondary')}
        aria-hidden
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Message box for a service that has no data to show. */
export function ServiceMessage<T>({ state, onRetry }: { state: ServiceState<T>; onRetry: () => void }) {
  if (state.status === 'unconfigured') {
    return <Notice>{state.error} This isn’t an error with your trip.</Notice>
  }
  return (
    <Notice tone="error">
      {state.status === 'timeout' ? 'This is taking too long. ' : 'This service is unavailable right now. '}
      <span className="text-text-secondary">{state.error}</span>
      <div>
        <RetryButton onRetry={onRetry} />
      </div>
    </Notice>
  )
}

interface ServiceCardProps<T> extends Omit<CardProps, 'children'> {
  state?: ServiceState<T>
  loading: boolean
  onRetry: () => void
  /** Loading placeholder in the shape of this card's real content. */
  skeleton?: ReactNode
  children: (data: T) => ReactNode
}

export function ServiceCard<T>({ state, loading, onRetry, skeleton, children, action, ...cardProps }: ServiceCardProps<T>) {
  const hasData = state?.data !== undefined
  const stale = hasData && state.status !== 'ok' && !loading

  return (
    <Card
      {...cardProps}
      action={
        loading && hasData ? (
          <span className="flex items-center gap-1.5 text-body-regular text-text-secondary" role="status">
            <Spinner size="sm" aria-hidden /> Updating
          </span>
        ) : (
          action
        )
      }
    >
      {hasData ? (
        <>
          {stale && (
            <Notice tone="warning" className="mb-4">
              <strong className="font-semibold">Saved data from {formatUpdated(state.fetchedAt!)}.</strong> The latest refresh
              didn’t work ({state.status === 'timeout' ? 'timed out' : state.error?.replace(/\.$/, '')}).
              <div>
                <RetryButton onRetry={onRetry} />
              </div>
            </Notice>
          )}
          {children(state.data as T)}
          {state.fetchedAt && !stale && (
            <p className="mt-4 text-body-regular text-text-tertiary">Updated {formatUpdated(state.fetchedAt)}</p>
          )}
        </>
      ) : loading || !state ? (
        <div aria-busy="true" className="space-y-3">
          {skeleton ?? (
            <>
              <SkeletonText lines={2} />
              <Skeleton className="h-24" />
            </>
          )}
          <p className="flex items-center gap-1.5 text-body-regular text-text-secondary" role="status">
            <Spinner size="sm" aria-hidden /> Loading…
          </p>
        </div>
      ) : (
        <ServiceMessage state={state} onRetry={onRetry} />
      )}
    </Card>
  )
}

/** Empty state: soft panel with faint contour art, a dark icon badge, a message and optional actions. */
export function EmptyState({
  icon: Icon,
  title,
  actions,
  className,
  children,
}: {
  icon: LucideIcon
  title?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cx(
        'relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-3xl bg-background-secondary-default px-5 py-10 text-center',
        className,
      )}
    >
      <TopoArt seed={title ?? 'Nothing here yet'} peaks={2} rings={10} className="-z-10 text-foreground-icon-quaternary opacity-60" />
      <span className="grid size-11 place-items-center rounded-full bg-neutral-950 text-white">
        <Icon className="size-5" aria-hidden />
      </span>
      {title && <h3 className="font-display text-title-1-semibold tracking-tight text-text-primary">{title}</h3>}
      <div className="max-w-md text-body-regular text-text-secondary">{children}</div>
      {actions && <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
