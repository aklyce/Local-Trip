/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TICKETMASTER_KEY?: string
  /** Groq API key for the fast trip search (optional; without it the on-device model is used). */
  readonly VITE_GROQ_KEY?: string
}
