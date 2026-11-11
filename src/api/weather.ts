import { addDays, shiftYears, today } from '../lib/dates'
import type { DailyWeather, Place, WeatherResult } from '../types'

// https://open-meteo.com — free, no key.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const FORECAST_DAYS = 16

interface OpenMeteoDaily {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  weather_code: number[]
  precipitation_probability_max?: (number | null)[]
  precipitation_sum?: (number | null)[]
}

export async function getWeather(place: Place, startDate: string, endDate: string): Promise<WeatherResult> {
  const now = today()
  const inForecastWindow = startDate >= now && endDate < addDays(now, FORECAST_DAYS)

  if (inForecastWindow) {
    const days = await fetchDaily(FORECAST_URL, place, startDate, endDate, 'precipitation_probability_max')
    return { kind: 'forecast', days }
  }

  // Too far ahead (or in the past): show the same dates one year earlier as a rough guide.
  const days = await fetchDaily(
    ARCHIVE_URL,
    place,
    shiftYears(startDate, -1),
    shiftYears(endDate, -1),
    'precipitation_sum',
  )
  return { kind: 'historical', days }
}

async function fetchDaily(
  baseUrl: string,
  place: Place,
  startDate: string,
  endDate: string,
  precipField: 'precipitation_probability_max' | 'precipitation_sum',
): Promise<DailyWeather[]> {
  const url = new URL(baseUrl)
  url.searchParams.set('latitude', String(place.lat))
  url.searchParams.set('longitude', String(place.lon))
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('daily', ['temperature_2m_max', 'temperature_2m_min', 'weather_code', precipField].join(','))

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`)
  const { daily }: { daily: OpenMeteoDaily } = await res.json()

  return daily.time.map((date, i) => ({
    date,
    tempMax: daily.temperature_2m_max[i],
    tempMin: daily.temperature_2m_min[i],
    weatherCode: daily.weather_code[i],
    precipitation: daily[precipField]?.[i] ?? null,
  }))
}

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

/** WMO weather codes → broad category. https://open-meteo.com/en/docs (bottom of page) */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain'
  if (code <= 86) return 'snow'
  return 'storm'
}

const LABELS: Record<WeatherKind, string> = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloudy: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm',
}

export function describeWeatherCode(code: number): string {
  return LABELS[weatherKind(code)]
}
