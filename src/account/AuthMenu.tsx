// Floating nav bar Sign-in / Account button + AuthModal.
// Renders nothing when Supabase env vars are absent so the core app is unaffected.
import { LogIn, LogOut, User as UserIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/base/modal/modal'
import { SpinnerGlyph } from '@/components/base/spinner/spinner'
import { Notice } from '../components/Card'
import { useAuth } from './authContext'

function ButtonSpinner({ className }: { className?: string }) {
  return <SpinnerGlyph size="sm" className={className} />
}

export default function AuthMenu() {
  const { enabled, user, loading, signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!enabled || loading) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.')
      return
    }
    setSubmitting(true)
    setError(null)
    const err = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    setOpen(false)
    setPassword('')
    navigate('/')
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  if (user) {
    const shortEmail = user.email ? user.email.split('@')[0] : 'Account'
    return (
      <div className="ml-1 flex items-center gap-1 border-l border-white/15 pl-2">
        <span
          title={`Signed in as ${user.email ?? 'user'}`}
          className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-caption-1-medium text-white/95 sm:inline-flex"
        >
          <UserIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-[96px] truncate">{shortEmail}</span>
        </span>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          aria-busy={signingOut || undefined}
          aria-label={signingOut ? 'Signing out' : 'Sign out'}
          title="Sign out"
          className="flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-body-medium text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
        >
          {signingOut ? (
            <SpinnerGlyph size="sm" className="size-4 shrink-0 text-current" />
          ) : (
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="hidden md:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        aria-label="Sign in"
        className="flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-body-medium text-white/85 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
      >
        <LogIn className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign in</span>
      </button>

      <Modal isOpen={open} onOpenChange={setOpen} size="sm">
        {({ close }) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader
              title={mode === 'signin' ? 'Sign in to Local Trip' : 'Create your account'}
              description="Save your My Trips wishlist to your account and get trip updates."
            />
            <ModalBody className="space-y-4">
              {error && <Notice tone="error">{error}</Notice>}
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@berkeley.edu"
                isRequired
                autoFocus
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="At least 6 characters"
                isRequired
              />
              <p className="text-caption-1-regular text-text-secondary">
                {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                  }}
                  className="cursor-pointer font-medium text-accent-600 underline-offset-2 hover:underline"
                >
                  {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
                </button>
              </p>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} leadingIcon={submitting ? ButtonSpinner : undefined}>
                {submitting ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </>
  )
}
