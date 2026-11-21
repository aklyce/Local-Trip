// Natural-language trip search.
// Turns "I want to go to SF next week from LA" into the same fields the plan form uses
// (origin, destination, start/end dates). Two interchangeable engines, same prompt and same
// validation:
//   - "groq":  hosted model via the Groq API (src/api/groq.ts) — fast, needs VITE_GROQ_KEY.
//   - "local": WebLLM, runs fully in the browser on WebGPU — no key, ~1 GB download on first use.
// The model only *extracts*; all validation happens here in code, and the user still reviews the
// filled form before saving.
//
// Small models are bad at date arithmetic, so the prompt hands the model a ready-made calendar
// (today, this/next weekend, next week, the next 60 days with weekdays) to copy dates from.
import type { InitProgressReport, MLCEngineInterface } from '@mlc-ai/web-llm'
import { searchPlaces } from '../api/geocode'
import { groqConfigured, groqJson } from '../api/groq'
import { CURATED_PLACES, DISCOVER_ORIGIN } from '../data/destinations'
import type { Place } from '../types'
import { addDays, formatWeekday, today } from './dates'
import { dateAnchors, resolveRelativeDates } from './relativeDates'

/**
 * ~1 GB download on first use, then cached by the browser. Good balance of size and accuracy.
 * The f16 build is faster but needs the WebGPU `shader-f16` feature, which some browsers
 * (e.g. Firefox) and GPUs don't offer; those get the f32 build of the same model.
 */
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC'

/** Default trip length when only a start date is given (matches the form: 3 days). */
const DEFAULT_EXTRA_DAYS = 2

/** What the model returns (raw, unvalidated). */
interface RawTrip {
  origin: string | null
  destination: string | null
  startDate: string | null
  endDate: string | null
  nights: number | null
}

/** What the form receives. Missing fields mean "leave the form value as it is". */
export interface ParsedTrip {
  origin?: Place
  destination?: Place
  startDate?: string
  endDate?: string
  /** Short notes for the user about things we couldn't fill in. */
  warnings: string[]
}

// JSON schema the model's output is constrained to (WebLLM grammar-constrained decoding).
const SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    origin: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    destination: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    startDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    endDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    nights: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
  },
  required: ['origin', 'destination', 'startDate', 'endDate', 'nights'],
})

// ---------- Engine (lazy, shared) ----------

let enginePromise: Promise<MLCEngineInterface> | null = null
const progressListeners = new Set<(r: InitProgressReport) => void>()

/** Quick sync pre-check: the browser exposes WebGPU at all. Not proof it can run the model. */
export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

export type Support = { ok: true; modelId: string } | { ok: false; reason: string }

// Minimal WebGPU shape we need (the project doesn't ship @webgpu/types).
interface GpuLike {
  requestAdapter(): Promise<{ features: { has(name: string): boolean } } | null>
}

const NEEDS_CHROME = 'Describing your trip in words needs WebGPU, which works best in Chrome or Edge on desktop.'

let supportPromise: Promise<Support> | null = null

/** Thrown when the browser can't run the model; its message is already user-facing. */
class UnsupportedError extends Error {}

/**
 * Ask the GPU what it can actually do (once per page). `navigator.gpu` existing isn't enough:
 * Firefox exposes it but may return no adapter or lack `shader-f16`.
 */
export function checkSupport(): Promise<Support> {
  supportPromise ??= (async (): Promise<Support> => {
    if (!hasWebGPU()) return { ok: false, reason: NEEDS_CHROME }
    try {
      const gpu = (navigator as Navigator & { gpu: GpuLike }).gpu
      const adapter = await gpu.requestAdapter()
      if (!adapter) return { ok: false, reason: `This browser has WebGPU turned off or no usable GPU. ${NEEDS_CHROME}` }
      return { ok: true, modelId: adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32 }
    } catch {
      return { ok: false, reason: NEEDS_CHROME }
    }
  })()
  return supportPromise
}

/**
 * Turn whatever failed into one readable sentence for the user. Note: errors from the WebLLM
 * worker arrive as plain strings, not Error objects.
 */
export function describeError(err: unknown, engine: Engine): string {
  if (err instanceof UnsupportedError) return err.message
  const text = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (engine === 'groq') {
    if (err instanceof DOMException && err.name === 'TimeoutError') return 'The online model took too long. Try again, or use the on-device model.'
    if (/rate limit/i.test(text)) return 'Too many requests to the online model right now. Wait a minute, or use the on-device model.'
    if (/groq error/i.test(text)) return `The online model didn’t answer (${text}). Try again, or use the on-device model.`
    if (/fetch|network|load failed/i.test(text)) return 'Couldn’t reach the online model. Check your connection, or use the on-device model.'
  } else {
    if (/webgpu|adapter|gpu device|shader|feature|limit/i.test(text)) return `This browser’s WebGPU can’t run the model. ${NEEDS_CHROME}`
    if (/quota|storage|cache/i.test(text)) return 'Not enough browser storage to download the model (about 1 GB). Free some space or try another browser.'
    if (/fetch|network|load failed/i.test(text)) return 'Couldn’t download the model. Check your connection and try again.'
  }
  return text ? `Couldn’t understand that (${text.slice(0, 160)}). Please fill in the form below.` : 'Couldn’t understand that. Please fill in the form below.'
}

/**
 * Load the model once and reuse it. The WebLLM library itself is imported dynamically so it
 * stays out of the main bundle until someone actually uses the search box.
 */
export function loadEngine(onProgress?: (r: InitProgressReport) => void): Promise<MLCEngineInterface> {
  if (onProgress) progressListeners.add(onProgress)
  if (!enginePromise) {
    enginePromise = (async () => {
      const support = await checkSupport()
      if (!support.ok) throw new UnsupportedError(support.reason)
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm')
      const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' })
      try {
        return await CreateWebWorkerMLCEngine(worker, support.modelId, {
          initProgressCallback: (r) => progressListeners.forEach((fn) => fn(r)),
        })
      } catch (err) {
        // Don't leave a half-initialised worker holding GPU memory; a retry starts fresh.
        worker.terminate()
        throw err
      }
    })()
    // A failed load (no WebGPU, network) must not stick: allow a retry.
    enginePromise.catch(() => {
      enginePromise = null
    })
  }
  return enginePromise.finally(() => {
    if (onProgress) progressListeners.delete(onProgress)
  })
}

// ---------- Prompt ----------

/** Ready-made dates so the model can copy instead of calculate (same anchors the code uses). */
function calendarHints(now: string): string {
  const a = dateAnchors(now)
  const lines = [
    `Today: ${now} (${formatWeekday(now)})`,
    `Tomorrow: ${a.tomorrow}`,
    `This weekend: ${a.thisWeekend[0]} to ${a.thisWeekend[1]}`,
    `Next weekend: ${a.nextWeekend[0]} to ${a.nextWeekend[1]}`,
    `Next week: ${a.nextWeek[0]} to ${a.nextWeek[1]}`,
    `In two weeks: ${a.inTwoWeeks[0]} to ${a.inTwoWeeks[1]}`,
    'Calendar:',
  ]
  for (let i = 0; i < 60; i++) {
    const d = addDays(now, i)
    lines.push(`${d} ${formatWeekday(d)}`)
  }
  return lines.join('\n')
}

function systemPrompt(now: string): string {
  return `You extract trip details from a user's message. Reply with JSON only.

Fields:
- origin: city the user leaves from, or null if not mentioned.
- destination: city the user goes to, or null.
- startDate, endDate: YYYY-MM-DD, or null if not mentioned. Copy dates from the calendar below. Never use a date before today.
- nights: number of nights if the user gives a length ("for 3 days" = 2 nights, "a week" = 7 nights), else null.

Write cities as full names with state or country, e.g. "SF" -> "San Francisco, California", "LA" -> "Los Angeles, California", "NYC" -> "New York City, New York".
"from X" or "leaving X" means X is the origin. "to Y", "visit Y" or "go to Y" means Y is the destination.

Example: "I want to go to SF next week from LA" -> origin "Los Angeles, California", destination "San Francisco, California".
If the user says "next week" without a length, use the whole "Next week" range. "This weekend" / "next weekend" use Saturday to Sunday.

${calendarHints(now)}`
}

// ---------- Validation + geocoding ----------

const ISO = /^\d{4}-\d{2}-\d{2}$/

function validDate(s: string | null): string | undefined {
  if (!s || !ISO.test(s)) return undefined
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : s
}

/**
 * Common abbreviations, expanded in code because the small model doesn't always do it
 * (and Photon reads "SF" as Sfax, Tunisia).
 */
const ALIASES: Record<string, string> = {
  sf: 'San Francisco, California',
  sfo: 'San Francisco, California',
  'san fran': 'San Francisco, California',
  la: 'Los Angeles, California',
  lax: 'Los Angeles, California',
  sd: 'San Diego, California',
  sj: 'San Jose, California',
  sac: 'Sacramento, California',
  slo: 'San Luis Obispo, California',
  oak: 'Oakland, California',
  tahoe: 'South Lake Tahoe, California',
  vegas: 'Las Vegas, Nevada',
  lv: 'Las Vegas, Nevada',
  nyc: 'New York City, New York',
  ny: 'New York City, New York',
  dc: 'Washington, District of Columbia',
  pdx: 'Portland, Oregon',
  sea: 'Seattle, Washington',
  chi: 'Chicago, Illinois',
}

function expandAlias(name: string): string {
  const key = name.split(',')[0].trim().toLowerCase().replace(/\.$/, '')
  return ALIASES[key] ?? name
}

/**
 * First Photon hit for the name. Cities first (so "Monterey" is the city, not the county), then
 * other areas like "Lake Tahoe" or national parks. Falls back to curated places if Photon is down.
 */
async function resolvePlace(rawName: string): Promise<Place | undefined> {
  const name = expandAlias(rawName)
  if (/^berkeley\b/i.test(name)) return DISCOVER_ORIGIN
  try {
    const [city] = await searchPlaces(name, undefined, ['city'])
    if (city) return city
    const [area] = await searchPlaces(name, undefined, ['locality', 'district', 'county', 'state', 'other'])
    if (area) return area
  } catch {
    // fall through to curated places
  }
  const q = name.split(',')[0].trim().toLowerCase()
  return CURATED_PLACES.find((p) => p.name.toLowerCase().includes(q))
}

/**
 * Turn the model's raw JSON into safe form values. Exported for reuse/testing.
 * Relative phrases found in the user's own text ("next weekend", "for 3 days") win over the
 * model's dates, because code resolves those reliably.
 */
export async function normalize(raw: RawTrip, text: string, now = today()): Promise<ParsedTrip> {
  const warnings: string[] = []
  const out: ParsedTrip = { warnings }

  const [origin, destination] = await Promise.all([
    raw.origin ? resolvePlace(raw.origin) : undefined,
    raw.destination ? resolvePlace(raw.destination) : undefined,
  ])
  if (raw.destination && !destination) warnings.push(`Couldn’t find “${raw.destination}”. Pick the destination below.`)
  else if (!raw.destination) warnings.push('No destination found in your message. Pick one below.')
  if (raw.origin && !origin) warnings.push(`Couldn’t find “${raw.origin}”. Check “Leaving from”.`)
  out.origin = origin
  out.destination = destination

  const rel = resolveRelativeDates(text, now)
  let start = rel.start ?? validDate(raw.startDate)
  let end = rel.start ? rel.end : validDate(raw.endDate)
  const nights = rel.nights ?? raw.nights
  // A stated length decides the end ("next week for 3 days" = Mon to Wed).
  if (start && nights !== null && nights !== undefined && nights >= 0 && nights < 60) end = addDays(start, nights)
  if (start && start < now) {
    warnings.push('That start date is in the past, so dates were left as they were.')
    start = undefined
    end = undefined
  }
  if (start) {
    if (!end || end < start) end = addDays(start, DEFAULT_EXTRA_DAYS)
    out.startDate = start
    out.endDate = end
  } else if (raw.startDate || raw.endDate) {
    warnings.push('Couldn’t read the dates. Please check them below.')
  }
  return out
}

// ---------- Engine choice ----------

export type Engine = 'groq' | 'local'
const ENGINE_KEY = 'localTrip.tripSearchEngine'

/** Last engine the user picked; Groq by default when a key is configured. */
export function preferredEngine(): Engine {
  const saved = localStorage.getItem(ENGINE_KEY)
  if (saved === 'local' || !groqConfigured()) return 'local'
  return 'groq'
}

export function savePreferredEngine(engine: Engine): void {
  localStorage.setItem(ENGINE_KEY, engine)
}

/** Full pipeline: text → model (Groq or on-device) → validated, geocoded form values. */
export async function parseTripRequest(
  text: string,
  engine: Engine,
  onProgress?: (r: InitProgressReport) => void,
): Promise<ParsedTrip> {
  const now = today()
  const messages = [
    { role: 'system' as const, content: systemPrompt(now) },
    { role: 'user' as const, content: text },
  ]
  let content: string
  if (engine === 'groq') {
    content = await groqJson(messages)
  } else {
    const llm = await loadEngine(onProgress)
    const reply = await llm.chat.completions.create({
      messages,
      temperature: 0,
      max_tokens: 120,
      response_format: { type: 'json_object', schema: SCHEMA },
    })
    content = reply.choices[0]?.message.content ?? '{}'
  }
  // Handy when demoing or debugging: shows exactly what the model extracted.
  console.debug(`[trip search] ${engine} model output:`, content)
  let raw: RawTrip
  try {
    raw = { origin: null, destination: null, startDate: null, endDate: null, nights: null, ...JSON.parse(content) }
  } catch {
    throw new Error('The model returned something unreadable. Try rephrasing.')
  }
  return normalize(raw, text, now)
}
