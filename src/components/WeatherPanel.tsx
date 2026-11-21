// Weather for the trip dates (FR-6): one coloured tile per day, then two charts.
// Tile colour follows the conditions (sun = yellow, rain = blue …) and always comes with an icon
// and a text label, so it never relies on colour alone. Charts are Recharts, styled with BoardUI tokens.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { describeWeatherCode, weatherKind, type WeatherKind } from '../api/weather'
import { formatShort, formatWeekday } from '../lib/dates'
import { mmToIn, toF } from '../lib/transport'
import type { WeatherResult } from '../types'
import WeatherIcon from './WeatherIcon'

const HIGH = 'var(--color-orange-500)'
const LOW = 'var(--color-accent-600)'
const GRID = 'var(--color-separator-border)'
const AXIS_TICK = { fill: 'var(--color-text-secondary)', fontSize: 12 }

/** Tile background + text colour per condition (each pair checked for readable contrast). */
const TILE: Record<WeatherKind, string> = {
  clear: 'bg-yellow-400 text-yellow-950',
  partly: 'bg-yellow-300 text-yellow-950',
  cloudy: 'bg-neutral-300 text-neutral-950',
  fog: 'bg-neutral-200 text-neutral-950',
  drizzle: 'bg-cyan-500 text-cyan-950',
  rain: 'bg-accent-600 text-white',
  snow: 'bg-cyan-100 text-cyan-950',
  storm: 'bg-purple-700 text-white',
}

function ChartTooltip({ active, payload, label, unit, digits = 0 }: TooltipContentProps & { unit: string; digits?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-neutral-950 px-3 py-2 text-body-regular text-white shadow-dropdown">
      <div className="mb-1 text-body-semibold">{label}</div>
      {payload.map((row) => (
        <div key={String(row.name)} className="flex items-center gap-2 text-white/80">
          <span className="size-2.5 rounded-full" style={{ background: row.color }} />
          {row.name}
          <span className="ml-auto pl-4 font-semibold text-white tabular-nums">
            {typeof row.value === 'number' ? row.value.toFixed(digits) : '–'}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function WeatherPanel({ weather }: { weather: WeatherResult }) {
  const isForecast = weather.kind === 'forecast'
  const data = weather.days.map((d) => ({
    label: formatShort(d.date),
    High: toF(d.tempMax),
    Low: toF(d.tempMin),
    // Forecast: chance of rain (%). Historical: amount, stored in mm and shown in inches.
    precip: d.precipitation === null ? null : isForecast ? d.precipitation : mmToIn(d.precipitation),
  }))
  const precipUnit = isForecast ? '%' : ' in'
  const precipDigits = isForecast ? 0 : 2
  /** One precipitation value (raw, as stored) formatted for display. */
  const showPrecip = (v: number) => (isForecast ? Math.round(v) : mmToIn(v).toFixed(precipDigits))

  // Headline facts above each chart: the warmest and the wettest day.
  const warmest = weather.days.reduce((a, b) => (b.tempMax > a.tempMax ? b : a))
  const wettest = weather.days.reduce((a, b) => ((b.precipitation ?? 0) > (a.precipitation ?? 0) ? b : a))
  const anyRain = (wettest.precipitation ?? 0) > 0

  return (
    <div className="space-y-5">
      {/* Day tiles: scroll sideways on long trips */}
      <ol className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {weather.days.map((d) => (
          <li
            key={d.date}
            className={`flex min-w-36 flex-1 shrink-0 flex-col rounded-3xl p-4 ${TILE[weatherKind(d.weatherCode)]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-body-semibold">{formatWeekday(d.date)}</div>
                <div className="text-body-regular opacity-75">{formatShort(d.date)}</div>
              </div>
              <WeatherIcon code={d.weatherCode} plain className="size-7" aria-hidden />
            </div>
            <div className="mt-6 font-display text-display-1-bold leading-none tracking-tight tabular-nums">
              {Math.round(toF(d.tempMax))}°
            </div>
            <div className="mt-2 text-body-medium">
              Low {Math.round(toF(d.tempMin))}° <span className="sr-only">Fahrenheit</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-current/20 pt-3 text-body-regular">
              <span>{describeWeatherCode(d.weatherCode)}</span>
              {d.precipitation !== null && (
                <span className="tabular-nums">
                  {showPrecip(d.precipitation)}
                  {precipUnit}
                  <span className="sr-only">{isForecast ? ' chance of rain' : ' of precipitation'}</span>
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Temperature: two series, so a legend; one axis in °F (data is stored in °C) */}
        <figure className="rounded-3xl bg-background-secondary-default p-5 lg:col-span-3">
          <figcaption className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-body-medium text-text-secondary">Temperature (°F)</div>
              <div className="font-display text-title-1-semibold tracking-tight text-text-primary">
                Warmest {formatWeekday(warmest.date)}, {Math.round(toF(warmest.tempMax))}°
              </div>
            </div>
            <span className="flex gap-4 text-body-regular text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full" style={{ background: HIGH }} /> Daily high
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full" style={{ background: LOW }} /> Daily low
              </span>
            </span>
          </figcaption>
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="weather-high-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HIGH} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={HIGH} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 6" />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit="°" allowDecimals={false} />
                <Tooltip content={(p) => <ChartTooltip {...p} unit="°F" />} cursor={{ stroke: 'var(--color-border-button-hover)' }} />
                <Area
                  dataKey="High"
                  name="Daily high"
                  type="monotone"
                  stroke={HIGH}
                  strokeWidth={3}
                  fill="url(#weather-high-fill)"
                  dot={{ r: 4, fill: HIGH, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: HIGH, stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  dataKey="Low"
                  name="Daily low"
                  type="monotone"
                  stroke={LOW}
                  strokeWidth={3}
                  strokeLinecap="round"
                  dot={{ r: 4, fill: LOW, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: LOW, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </figure>

        {/* Precipitation: a separate chart rather than a second y-axis */}
        <figure className="rounded-3xl bg-background-secondary-default p-5 lg:col-span-2">
          <figcaption className="mb-4">
            <div className="text-body-medium text-text-secondary">{isForecast ? 'Chance of rain (%)' : 'Precipitation (in)'}</div>
            <div className="font-display text-title-1-semibold tracking-tight text-text-primary">
              {anyRain
                ? `Wettest ${formatWeekday(wettest.date)}, ${showPrecip(wettest.precipitation ?? 0)}${precipUnit}`
                : 'Dry all trip'}
            </div>
          </figcaption>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 6" />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  // Inches are small numbers (0.25 in is a wet day), so allow decimals there.
                  allowDecimals={!isForecast}
                  domain={isForecast ? [0, 100] : [0, (max: number) => Math.max(0.5, max)]}
                />
                <Tooltip content={(p) => <ChartTooltip {...p} unit={precipUnit} digits={precipDigits} />} cursor={false} />
                <Bar
                  dataKey="precip"
                  name={isForecast ? 'Chance of rain' : 'Precipitation'}
                  fill={LOW}
                  maxBarSize={28}
                  radius={[8, 8, 8, 8]}
                  background={{ fill: 'var(--color-background-tertiary-default)', radius: 8 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
    </div>
  )
}
