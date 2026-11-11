// Public holidays from Nager.Date (FR-8). Queries every calendar year the trip covers, then keeps
// holidays inside the inclusive date range. Regional holidays (not nationwide) are flagged.
// https://date.nager.at — free, no key. Not every country is supported.
import type { Holiday } from '../types'

interface NagerHoliday {
  date: string
  localName: string
  name: string
  /** false = only some states/regions observe it */
  global: boolean
}
const NAGER_URL = 'https://date.nager.at/api/v3/PublicHolidays'

export async function getHolidays(
  countryCode: string | undefined,
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<Holiday[]> {
  if (!countryCode) throw new Error('Unknown country for this destination')

  const startYear = Number(startDate.slice(0, 4))
  const endYear = Number(endDate.slice(0, 4))
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  const perYear = await Promise.all(
    years.map(async (year) => {
      const res = await fetch(`${NAGER_URL}/${year}/${countryCode}`, { signal })
      if (res.status === 404 || res.status === 204) throw new Error(`Holidays not available for ${countryCode}`)
      if (!res.ok) throw new Error(`Nager.Date error ${res.status}`)
      return (await res.json()) as NagerHoliday[]
    }),
  )

  return perYear
    .flat()
    .filter((h) => h.date >= startDate && h.date <= endDate)
    .map(({ date, localName, name, global }) => ({ date, localName, name, regional: !global }))
}
