// App shell: top navigation, routes, footer, and the single shared PlanTripDialog.
// Any page can open the dialog through usePlanTrip() (see src/lib/planTrip.ts).
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Compass, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import PlanTripDialog, { type PlanRequest } from './components/PlanTripDialog'
import { db } from './db'
import { PlanTripContext } from './lib/planTrip'
import DiscoverPage from './pages/DiscoverPage'
import HistoryPage from './pages/HistoryPage'
import TripPage from './pages/TripPage'
import type { Place } from './types'

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
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<DiscoverPage />} />
              <Route path="/trip/:id" element={<TripPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
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
