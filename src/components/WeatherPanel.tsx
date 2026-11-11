import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { describeWeatherCode } from '../api/weather'
import { formatShort, formatWeekday } from '../lib/dates'
import type { WeatherResult } from '../types'
import WeatherIcon from './WeatherIcon'

const HIGH = 'var(--color-series-2)'
const LOW = 'var(--color-series-1)'
const GRID = '#ece8e0'
const AXIS_TICK = { fill: '#8a94a6', fontSize: 12 }

function ChartTooltip({ active, payload, label, unit }: TooltipContentProps & { unit: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 font-medium text-ink">{label}</div>
      {payload.map((row) => (
        <div key={String(row.name)} className="flex items-center gap-2 text-ink-soft">
          <span className="size-2.5 rounded-full" style={{ background: row.color }} />
          {row.name}
          <span className="ml-auto pl-4 font-semibold text-ink">
            {typeof row.value === 'number' ? Math.round(row.value) : '–'}
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
    High: d.tempMax,
    Low: d.tempMin,
    precip: d.precipitation,
  }))
  const precipUnit = isForecast ? '%' : ' mm'

  return (
    <div className="space-y-6">
      {/* Daily strip */}
      <ol className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {weather.days.map((d) => (
          <li
            key={d.date}
            title={describeWeatherCode(d.weatherCode)}
            className="flex min-w-24 flex-1 shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-paper px-2 py-3 text-center"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{formatWeekday(d.date)}</span>
            <span className="text-xs text-ink-muted">{formatShort(d.date)}</span>
            <WeatherIcon code={d.weatherCode} className="my-1 size-8" />
            <span className="text-sm">
              <span className="font-semibold text-ink">{Math.round(d.tempMax)}°</span>{' '}
              <span className="text-ink-muted">{Math.round(d.tempMin)}°</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Temperature: two series, so a legend; one axis in °C */}
        <figure className="lg:col-span-3">
          <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">Temperature (°C)</span>
            <span className="flex gap-4 text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: HIGH }} /> Daily high
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: LOW }} /> Daily low
              </span>
            </span>
          </figcaption>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit="°" allowDecimals={false} />
                <Tooltip content={(p) => <ChartTooltip {...p} unit="°C" />} cursor={{ stroke: '#cbd5e1' }} />
                {[
                  ['High', HIGH],
                  ['Low', LOW],
                ].map(([key, color]) => (
                  <Line
                    key={key}
                    dataKey={key}
                    name={key === 'High' ? 'Daily high' : 'Daily low'}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>

        {/* Precipitation: a separate chart rather than a second y-axis */}
        <figure className="lg:col-span-2">
          <figcaption className="mb-3 text-sm font-semibold text-ink">
            {isForecast ? 'Chance of rain (%)' : 'Precipitation (mm)'}
          </figcaption>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={isForecast ? [0, 100] : [0, 'auto']}
                />
                <Tooltip content={(p) => <ChartTooltip {...p} unit={precipUnit} />} cursor={{ fill: 'rgba(42,120,214,0.06)' }} />
                <Bar dataKey="precip" name={isForecast ? 'Chance of rain' : 'Precipitation'} fill={LOW} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>
    </div>
  )
}
