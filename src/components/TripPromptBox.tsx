// "Describe your trip" box at the top of the plan form (natural-language search).
// The user writes one sentence; a model fills the same fields they could fill by hand.
// Nothing is saved here: the filled form is shown for review and saved with the normal button.
// Engine: the fast online model (Groq) by default when a key is configured; a gray link below
// switches to the on-device model (WebLLM) and back. The choice is remembered.
// If neither can run (no Groq key and no usable WebGPU, e.g. Firefox) the box explains why and
// the manual form below keeps working.
import { AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from 'react'
import { groqConfigured } from '../api/groq'
import {
  checkSupport,
  describeError,
  parseTripRequest,
  preferredEngine,
  savePreferredEngine,
  type Engine,
  type ParsedTrip,
  type Support,
} from '../lib/tripParser'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; progress: number; text: string }
  | { kind: 'thinking' }
  | { kind: 'done'; warnings: string[] }
  | { kind: 'error'; message: string }

interface Props {
  /** Text typed elsewhere (Discover search) — parsed right away when the form opens. */
  initialText?: string
  /** Focus the text box when the dialog opens. */
  autoFocus?: boolean
  onParsed: (trip: ParsedTrip) => void
}

export default function TripPromptBox({ initialText = '', autoFocus, onParsed }: Props) {
  const [text, setText] = useState(initialText)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [engine, setEngine] = useState<Engine>(preferredEngine)
  // null while we ask the GPU what it supports (takes a few ms).
  const [support, setSupport] = useState<Support | null>(null)
  const hasGroq = groqConfigured()
  const localOk = support?.ok === true
  // Can the chosen engine run right now?
  const supported = engine === 'groq' ? hasGroq : localOk
  const busy = status.kind === 'loading' || status.kind === 'thinking'
  const autoRan = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let live = true
    void checkSupport().then((s) => live && setSupport(s))
    return () => {
      live = false
    }
  }, [])

  function switchEngine(next: Engine) {
    setEngine(next)
    savePreferredEngine(next)
    setStatus({ kind: 'idle' })
    textareaRef.current?.focus()
  }

  // The box may appear only after the support check, i.e. after the dialog already set focus.
  useEffect(() => {
    if (supported && autoFocus) textareaRef.current?.focus()
  }, [supported, autoFocus])

  async function run(input: string) {
    if (!input.trim() || busy) return
    setStatus({ kind: 'thinking' })
    try {
      const parsed = await parseTripRequest(input, engine, (r) =>
        // Progress only arrives while the model downloads / initialises (first use).
        setStatus(r.progress < 1 ? { kind: 'loading', progress: r.progress, text: r.text } : { kind: 'thinking' }),
      )
      onParsed(parsed)
      setStatus({ kind: 'done', warnings: parsed.warnings })
    } catch (err) {
      // Keep the real cause in the console for debugging (Groq, WebGPU, download, model errors).
      console.error(`[trip search] ${engine} failed:`, err)
      setStatus({ kind: 'error', message: describeError(err, engine) })
    }
  }

  // Auto-run once when opened with text from the Discover search box.
  // useEffectEvent reads the latest `run` without making it an effect dependency.
  const autoRun = useEffectEvent((input: string) => void run(input))
  useEffect(() => {
    if (initialText && supported && !autoRan.current) {
      autoRan.current = true
      autoRun(initialText)
    }
  }, [initialText, supported])

  // Enter submits, Shift+Enter makes a new line.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void run(text)
    }
  }

  // On-device chosen: wait for the GPU check before showing anything.
  if (engine === 'local' && support === null) return null
  if (!supported) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-paper p-3 text-sm text-ink-soft">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
        <span>
          {support && !support.ok ? support.reason : 'Describing your trip in words isn’t available here.'} Fill in the
          form below instead.
          {hasGroq && (
            <>
              {' '}
              <EngineLink onClick={() => switchEngine('groq')}>Use the online model instead</EngineLink>
            </>
          )}
        </span>
      </p>
    )
  }

  return (
    // A <div> with its own submit handling, because this sits inside the plan <form> (no nested forms).
    <div role="search" aria-label="Describe your trip" className="rounded-2xl border border-line bg-paper p-3">
      <label htmlFor="trip-prompt" className="flex items-center gap-1.5 text-sm font-medium text-ink">
        <Sparkles className="size-4 text-accent" /> Describe your trip
      </label>
      <div className="mt-2 flex items-end gap-2">
        <textarea
          id="trip-prompt"
          ref={textareaRef}
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="I want to go to SF next week from LA for 3 days"
          className="min-h-[3.25rem] w-full resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
        />
        <button
          type="button"
          onClick={() => void run(text)}
          disabled={busy || !text.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Fill in
        </button>
      </div>

      <div aria-live="polite" className="text-sm">
        {status.kind === 'loading' && (
          <div className="mt-2">
            <p className="text-ink-muted">
              Loading the on-device model (first time only, about 1 GB)… {Math.round(status.progress * 100)}%
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-accent transition-all" style={{ width: `${status.progress * 100}%` }} />
            </div>
          </div>
        )}
        {status.kind === 'thinking' && <p className="mt-2 text-ink-muted">Reading your trip…</p>}
        {status.kind === 'done' && (
          <>
            <p className="mt-2 text-ink-soft">Filled in below. Check the details, then save.</p>
            {status.warnings.map((w) => (
              <p key={w} className="mt-1 flex items-start gap-1.5 text-amber-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {w}
              </p>
            ))}
          </>
        )}
        {status.kind === 'error' && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {status.message}
          </p>
        )}
      </div>

      {/* Engine switch: quiet gray text, only when the other engine can actually run. */}
      {engine === 'groq' && localOk && (
        <p className="mt-2 text-sm">
          <EngineLink onClick={() => switchEngine('local')} disabled={busy}>
            Use on-device model instead
          </EngineLink>
        </p>
      )}
      {engine === 'local' && hasGroq && (
        <p className="mt-2 text-sm">
          <EngineLink onClick={() => switchEngine('groq')} disabled={busy}>
            Use the faster online model instead
          </EngineLink>
        </p>
      )}
    </div>
  )
}

/** Gray, underline-on-hover text button for switching engines. */
function EngineLink({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}
