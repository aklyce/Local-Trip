export interface Place {
  name: string
  lat: number
  lon: number
  /** ISO 3166-1 alpha-2, e.g. "US". Needed for holiday lookups. */
  countryCode?: string
}

export interface DailyWeather {
  date: string
  tempMax: number
  tempMin: number
  /** Forecast gives a probability (%); historical data gives a sum (mm). */
  precipitation: number | null
  weatherCode: number
}

export interface WeatherResult {
  /** "forecast" for the next ~16 days, otherwise same dates from the previous year. */
  kind: 'forecast' | 'historical'
  days: DailyWeather[]
}

export interface EventItem {
  id: string
  name: string
  date: string
  /** HH:MM local time */
  time?: string
  url: string
  venue?: string
  image?: string
  /** e.g. "Music", "Sports" */
  category?: string
}

export interface Holiday {
  date: string
  localName: string
  name: string
}

/** Each section can fail independently, so one broken API doesn't blank the dashboard. */
export type Section<T> = { ok: true; data: T } | { ok: false; error: string }

export interface TripSnapshot {
  weather: Section<WeatherResult>
  events: Section<EventItem[]>
  holidays: Section<Holiday[]>
  distanceKm: number
  fetchedAt: number
}

export interface Trip {
  id?: number
  origin: Place
  destination: Place
  /** YYYY-MM-DD */
  startDate: string
  endDate: string
  createdAt: number
  snapshot?: TripSnapshot
  notes?: string
}
