import type { Holiday } from '../types'

// https://date.nager.at — free, no key. Not every country is supported.
const NAGER_URL = 'https://date.nager.at/api/v3/PublicHolidays'

export async function getHolidays(countryCode: string | undefined, startDate: string, endDate: string): Promise<Holiday[]> {
  if (!countryCode) throw new Error('Unknown country for this destination')

  const startYear = Number(startDate.slice(0, 4))
  const endYear = Number(endDate.slice(0, 4))
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  const perYear = await Promise.all(
    years.map(async (year) => {
      const res = await fetch(`${NAGER_URL}/${year}/${countryCode}`)
      if (res.status === 404 || res.status === 204) throw new Error(`Holidays not available for ${countryCode}`)
      if (!res.ok) throw new Error(`Nager.Date error ${res.status}`)
      return (await res.json()) as Holiday[]
    }),
  )

  return perYear
    .flat()
    .filter((h) => h.date >= startDate && h.date <= endDate)
    .map(({ date, localName, name }) => ({ date, localName, name }))
}
