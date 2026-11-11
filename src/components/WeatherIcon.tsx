import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideProps } from 'lucide-react'
import { weatherKind } from '../api/weather'

const ICONS = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

const COLORS = {
  clear: 'text-amber-500',
  partly: 'text-amber-500',
  cloudy: 'text-slate-400',
  fog: 'text-slate-400',
  drizzle: 'text-sky-500',
  rain: 'text-sky-600',
  snow: 'text-cyan-400',
  storm: 'text-indigo-500',
}

export default function WeatherIcon({ code, className = '', ...props }: { code: number } & LucideProps) {
  const kind = weatherKind(code)
  const Icon = ICONS[kind]
  return <Icon className={`${COLORS[kind]} ${className}`} strokeWidth={1.75} {...props} />
}
