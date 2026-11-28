// Isolated dark-mode toggle using BoardUI's built-in `.dark` CSS tokens (src/styles/theme.css).
// Persists preference in localStorage ('lt_theme') and leaves existing files untouched.
// Desktop (md+): floats in the top-right corner. Mobile (<md): sits inline in the nav bar so it never overlaps.
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import './dark-mode.css'

const STORAGE_KEY = 'lt_theme'

function getInitialDark(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

export default function ThemeToggle({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const [dark, setDark] = useState<boolean>(getInitialDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      // Ignore storage errors.
    }
  }, [dark])

  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  const Icon = dark ? Sun : Moon

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={() => setDark((d) => !d)}
        aria-label={label}
        title={label}
        aria-pressed={dark}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white md:hidden"
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={label}
      title={label}
      aria-pressed={dark}
      className="fixed right-5 top-5 z-50 hidden size-10 cursor-pointer items-center justify-center rounded-full bg-neutral-950/90 text-white/85 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] ring-1 ring-white/10 backdrop-blur-md outline-none transition-colors hover:bg-neutral-900 hover:text-white focus-visible:ring-2 focus-visible:ring-white md:flex"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
