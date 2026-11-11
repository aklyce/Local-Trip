/** Format a Date as YYYY-MM-DD in local time. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function shiftYears(iso: string, years: number): string {
  const d = parse(iso)
  d.setFullYear(d.getFullYear() + years)
  return toISODate(d)
}

export function today(): string {
  return toISODate(new Date())
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000)
}

/** "Nov 2" */
export function formatShort(iso: string): string {
  return parse(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** "Mon" */
export function formatWeekday(iso: string): string {
  return parse(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

/** "Nov 2 – Nov 6, 2026" */
export function formatRange(start: string, end: string): string {
  return `${formatShort(start)} – ${formatShort(end)}, ${end.slice(0, 4)}`
}
