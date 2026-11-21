// "Describe your trip" box at the top of the plan form (natural-language search).
// The user writes one sentence; a model fills the same fields they could fill by hand.
// Nothing is saved here: the filled form is shown for review and saved with the normal button.
// Engine: the fast online model (Groq) by default when a key is configured; a gray link below
// switches to the on-device model (WebLLM) and back. The choice is remembered.
// If neither can run (no Groq key and no usable WebGPU, e.g. Firefox) the box explains why and
// the manual form below keeps working.
import { AlertCircle, Sparkles } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/base/buttons/button'
import { LinkButton } from '@/components/base/buttons/link-button'
import { ProgressBar } from '@/components/base/progress/progress'
import { SpinnerGlyph } from '@/components/base/spinner/spinner'
import { Textarea } from '@/components/base/textarea/textarea'
import { groqConfigured } from '../api/groq'
import { Notice } from './Card'
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
      <Notice icon={Sparkles}>
        {support && !support.ok ? support.reason : 'Describing your trip in words isn’t available here.'} Fill in the form
        below instead.
        {hasGroq && (
          <>
            {' '}
            <EngineLink onClick={() => switchEngine('groq')}>Use the online model instead</EngineLink>
          </>
        )}
      </Notice>
    )
  }

  return (
    // A <div> with its own submit handling, because this sits inside the plan <form> (no nested forms).
    <div role="search" aria-label="Describe your trip" className="rounded-2xl bg-background-secondary-default p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          label="Describe your trip"
          rows={2}
          value={text}
          onChange={setText}
          onKeyDown={onKeyDown}
          placeholder="I want to go to SF next week from LA for 3 days"
          className="min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          onClick={() => void run(text)}
          disabled={busy || !text.trim()}
          leadingIcon={busy ? BusyGlyph : Sparkles}
        >
          Fill in
        </Button>
      </div>

      <div aria-live="polite" className="text-body-regular">
        {status.kind === 'loading' && (
          <ProgressBar
            className="mt-3"
            size="sm"
            label="Loading the on-device model (first time only, about 1 GB)…"
            showValueLabel
            value={Math.round(status.progress * 100)}
          />
        )}
        {status.kind === 'thinking' && <p className="mt-2 text-text-secondary">Reading your trip…</p>}
        {status.kind === 'done' && (
          <>
            <p className="mt-2 text-text-secondary">Filled in below. Check the details, then save.</p>
            {status.warnings.map((w) => (
              <p key={w} className="mt-1 flex items-start gap-1.5 text-status-yellow-text">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {w}
              </p>
            ))}
          </>
        )}
        {status.kind === 'error' && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-text-error-primary">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {status.message}
          </p>
        )}
      </div>

      {/* Engine switch: quiet link, only when the other engine can actually run. */}
      {engine === 'groq' && localOk && (
        <p className="mt-2">
          <EngineLink onClick={() => switchEngine('local')} disabled={busy}>
            Use on-device model instead
          </EngineLink>
        </p>
      )}
      {engine === 'local' && hasGroq && (
        <p className="mt-2">
          <EngineLink onClick={() => switchEngine('groq')} disabled={busy}>
            Use the faster online model instead
          </EngineLink>
        </p>
      )}
    </div>
  )
}

function BusyGlyph({ className }: { className?: string }) {
  return <SpinnerGlyph size="sm" className={`${className ?? ''} text-current`} />
}

/** Quiet text button for switching engines. */
function EngineLink({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <LinkButton variant="secondary" onClick={onClick} disabled={disabled}>
      {children}
    </LinkButton>
  )
}
