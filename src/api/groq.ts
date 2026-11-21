// Groq chat completions (OpenAI-compatible) for the natural-language trip search.
// https://console.groq.com/docs/api-reference — free tier, answers in well under a second.
// Needs VITE_GROQ_KEY in .env. Note: anything prefixed VITE_ ends up in the client bundle, so use
// a free-tier key only. No key → ConfigError, and the trip box falls back to the on-device model.
import { ConfigError } from './errors'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
/** Fast and accurate on our extraction prompt (~0.3 s, handles relative dates well). */
export const GROQ_MODEL = 'qwen/qwen3.8-27b'
/** Same limit as the other services (src/api/index.ts). */
const TIMEOUT_MS = 10_000

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

/** true when a Groq key is configured, so the UI can offer Groq at all. */
export function groqConfigured(): boolean {
  return !!import.meta.env.VITE_GROQ_KEY
}

/** One JSON-mode completion; returns the raw message text (a JSON string). */
export async function groqJson(messages: ChatMessage[]): Promise<string> {
  const key = import.meta.env.VITE_GROQ_KEY
  if (!key) throw new ConfigError('Groq is not configured.')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 429) throw new Error('Groq rate limit reached')
  if (!res.ok) throw new Error(`Groq error ${res.status}`)
  const json: { choices?: { message?: { content?: string } }[] } = await res.json()
  return json.choices?.[0]?.message?.content ?? '{}'
}
