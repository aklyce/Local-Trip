// App shell: top navigation, routes, footer, and the single shared PlanTripDialog.
// Any page can open the dialog through usePlanTrip() (see src/lib/planTrip.ts).
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Compass, Plus } from 'lucide-react'
import { Suspense, lazy, useCallback, useState } from 'react'
import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import PlanTripDialog, { type PlanRequest } from './components/PlanTripDialog'
import { db } from './db'
import { PlanTripContext } from './lib/planTrip'
import DiscoverPage from './pages/DiscoverPage'
import HistoryPage from './pages/HistoryPage'
import type { Place } from './types'

// The dashboard pulls in Recharts and Leaflet, so load it only when a trip is opened.
// Discover and My trips stay in the main bundle for a fast first page.
const TripPage = lazy(() => import('./pages/TripPage'))

// Active link gets a pale fill and darker, heavier text (not color alone).
const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm sm:px-3.5 transition focus-visible:outline-2 focus-visible:outline-accent ${
    isActive ? 'bg-accent-soft font-semibold text-ink' : 'font-medium text-ink-soft hover:text-ink'
  }`

export default function App() {
  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null)
  const openPlan = useCallback((destination?: Place) => setPlanRequest({ key: Date.now(), destination }), [])
  const tripCount = useLiveQuery(() => db.trips.count(), [])

  // HashRouter so deep links work on static hosts like GitHub Pages without rewrite rules.
  return (
    <HashRouter>
      <PlanTripContext.Provider value={openPlan}>
        <div className="flex min-h-screen flex-col">
          {/* Keyboard users can jump past the navigation. Not an href="#…" because routing uses the hash. */}
          <a
            href="#main-content"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('main-content')?.focus()
            }}
            className="sr-only z-[1200] rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:px-4 focus:py-2"
          >
            Skip to content
          </a>
          <nav aria-label="Main" className="sticky top-0 z-[1100] border-b border-line/70 bg-paper/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <Link to="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-accent">
                <Compass className="hidden size-5 text-accent min-[400px]:block" />
                <span className="whitespace-nowrap font-display text-xl text-ink sm:text-2xl">
                  Local Trip<span className="text-accent">.</span>
                </span>
              </Link>
              <div className="flex items-center gap-1 sm:gap-2">
                <NavLink to="/" end className={navClass}>
                  Discover
                </NavLink>
                <NavLink to="/history" className={navClass}>
                  My trips
                  {!!tripCount && (
                    <span className="rounded-full bg-white px-1.5 text-xs font-semibold text-accent ring-1 ring-line">{tripCount}</span>
                  )}
                </NavLink>
                {/* Global entry point; collapses to an icon on phones so the nav fits at 375 px. */}
                <button
                  type="button"
                  onClick={() => openPlan()}
                  aria-label="Plan a trip"
                  className="ml-1 flex items-center gap-1.5 rounded-full border border-line bg-white p-2 text-sm font-semibold text-ink shadow-sm transition hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-accent sm:px-4 sm:py-1.5"
                >
                  <Plus className="size-4 sm:hidden" />
                  <span className="hidden sm:inline">Plan a trip</span>
                  <ArrowRight className="hidden size-4 sm:block" />
                </button>
              </div>
            </div>
          </nav>
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            <Suspense fallback={<p className="px-4 py-24 text-center text-ink-muted">Loading trip…</p>}>
              <Routes>
                <Route path="/" element={<DiscoverPage />} />
                <Route path="/trip/:id" element={<TripPage />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
            </Suspense>
          </main>
          <footer className="border-t border-line py-6 text-center text-sm text-ink-muted">
            Local Trip · INFO 253A Group 8 · Data from Photon, Open-Meteo, Ticketmaster, Nager.Date &amp; OSRM
          </footer>
        </div>
        <PlanTripDialog request={planRequest} onClose={() => setPlanRequest(null)} />
      </PlanTripContext.Provider>
    </HashRouter>
  )
}
