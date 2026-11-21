// Deterministic reading of everyday date phrases for the natural-language trip search.
// "next weekend", "next week", "next week on Wednesday", "tomorrow", "on Friday", "in two weeks",
// "for 3 days", "stay around two weeks", "return on Sunday".
// Small in-browser models are unreliable at date arithmetic, so these phrases are resolved here
// in code; the model's own dates are used only for explicit dates such as "Dec 5 to Dec 8".
import { addDays, daysBetween } from './dates'

/** Anchor dates relative to `now` (YYYY-MM-DD). Weeks start on Monday. */
export function dateAnchors(now: string) {
  const dow = new Date(`${now}T00:00:00`).getDay() // 0 = Sun … 6 = Sat
  // Sunday counts as part of the current weekend.
  const thisSat = dow === 0 ? addDays(now, -1) : addDays(now, 6 - dow)
  const nextMon = addDays(now, ((1 - dow + 7) % 7) || 7)
  return {
    today: now,
    tomorrow: addDays(now, 1),
    // If it's already Sunday, "this weekend" is just today.
    thisWeekend: [dow === 0 ? now : thisSat, addDays(thisSat, 1)] as const,
    nextWeekend: [addDays(thisSat, 7), addDays(thisSat, 8)] as const,
    nextWeek: [nextMon, addDays(nextMon, 6)] as const,
    inTwoWeeks: [addDays(nextMon, 7), addDays(nextMon, 13)] as const,
  }
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

export interface RelativeDates {
  start?: string
  end?: string
  /** Trip length in nights, if the text gives one ("for 3 days" = 2 nights). */
  nights?: number
}

/** Find relative date phrases in free text. Returns only what it is sure about. */
export function resolveRelativeDates(text: string, now: string): RelativeDates {
  const t = text.toLowerCase()
  const a = dateAnchors(now)
  const out: RelativeDates = {}

  // Length: "for 3 days", "for two nights", "for a week", "a long weekend".
  // (?<!in ) so "in two weeks" is read as *when*, not as a length.
  const len = t.match(/(?<!\bin )\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]+(day|night|week)s?\b/)
  if (len) {
    const n = /^\d+$/.test(len[1]) ? Number(len[1]) : NUMBER_WORDS[len[1]]
    if (len[2] === 'night') out.nights = n
    else if (len[2] === 'week') out.nights = n * 7
    else out.nights = Math.max(n - 1, 0) // "3 days" = 2 nights
  } else if (/\blong weekend\b/.test(t)) {
    out.nights = 3
  }

  // A weekday after "return / back / home / until" is the *end*, not the start.
  // ("leaving" is left out on purpose: "leaving Friday" usually means the departure.)
  const RETURN = /\b(?:return(?:ing)?|back|home|until|till)\s+(?:on\s+|by\s+|next\s+|this\s+|the\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  const returnDay = t.match(RETURN)
  // Remove it so the start search below doesn't pick it up.
  const startText = returnDay ? t.replace(returnDay[0], ' ') : t
  const startDay = startText.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)

  // Start (and sometimes end) from the most specific phrase first.
  let range: readonly [string, string] | undefined
  if (/\bnext week\b/.test(t) && startDay) {
    // "next week on Wednesday" → that weekday inside next week (Mon–Sun).
    out.start = addDays(a.nextWeek[0], (WEEKDAYS.indexOf(startDay[1]) + 6) % 7)
  } else if (/\bnext weekend\b/.test(t)) range = a.nextWeekend
  else if (/\bthis weekend\b|\b(the|over the) weekend\b/.test(t)) range = a.thisWeekend
  else if (/\bin (two|2) weeks\b/.test(t)) range = a.inTwoWeeks
  else if (/\bnext week\b/.test(t)) range = a.nextWeek
  else if (/\btomorrow\b/.test(t)) out.start = a.tomorrow
  else if (/\btoday\b|\btonight\b/.test(t)) out.start = a.today
  else if (startDay) {
    // "on friday", "this friday", "next friday" → the next such day after today.
    out.start = nextWeekday(now, startDay[1])
  }

  if (range) {
    out.start = range[0]
    // A whole-range phrase keeps its natural end unless a length was given.
    if (out.nights === undefined) out.end = range[1]
  }

  // "return on Sunday": with a length ("around two weeks"), take the Sunday closest to
  // start + length; without one, the first Sunday after the start.
  if (returnDay && out.start) {
    const target = out.nights !== undefined ? addDays(out.start, out.nights) : out.start
    const after = nextWeekday(target, returnDay[1], out.nights === undefined ? 1 : 0)
    const before = addDays(after, -7)
    const pick = out.nights !== undefined && before > out.start && daysBetween(before, target) < daysBetween(target, after) ? before : after
    out.end = pick
    out.nights = daysBetween(out.start, pick)
  }
  return out
}

/** First `weekday` on or after `from` + `minDays` (default: strictly after `from`). */
function nextWeekday(from: string, weekday: string, minDays = 1): string {
  const dow = new Date(`${from}T00:00:00`).getDay()
  let diff = (WEEKDAYS.indexOf(weekday) - dow + 7) % 7
  if (diff < minDays) diff += 7
  return addDays(from, diff)
}
