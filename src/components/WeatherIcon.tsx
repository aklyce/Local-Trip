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
  clear: 'text-yellow-500',
  partly: 'text-yellow-500',
  cloudy: 'text-foreground-icon-tertiary',
  fog: 'text-foreground-icon-tertiary',
  drizzle: 'text-accent-400',
  rain: 'text-accent-500',
  snow: 'text-cyan-400',
  storm: 'text-purple-500',
}

/** `plain` drops the per-condition colour so the icon inherits the text colour (coloured day tiles). */
export default function WeatherIcon({ code, plain = false, className = '', ...props }: { code: number; plain?: boolean } & LucideProps) {
  const kind = weatherKind(code)
  const Icon = ICONS[kind]
  return <Icon className={`${plain ? '' : COLORS[kind]} ${className}`} strokeWidth={1.75} {...props} />
}
