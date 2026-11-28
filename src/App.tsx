// App shell: top navigation, routes, footer, and the single shared PlanTripDialog.
// Any page can open the dialog through usePlanTrip() (see src/lib/planTrip.ts).
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { Suspense, lazy, useCallback, useState } from 'react'
import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { Button } from '@/components/base/buttons/button'
import { Spinner } from '@/components/base/spinner/spinner'
import { cx } from '@/utils/cx'
import Logo from './components/Logo'
import TopoArt from './components/TopoArt'
import PlanTripDialog, { type PlanRequest } from './components/PlanTripDialog'
import AuthMenu from './account/AuthMenu'
import { AuthProvider } from './account/AuthProvider'
import ThemeToggle from './account/ThemeToggle'
import { db } from './db'
import { PlanTripContext } from './lib/planTrip'
import DiscoverPage from './pages/DiscoverPage'
import HistoryPage from './pages/HistoryPage'
import type { Place } from './types'

// The dashboard pulls in Recharts and Leaflet, so load it only when a trip is opened.
// Discover and My trips stay in the main bundle for a fast first page.
const TripPage = lazy(() => import('./pages/TripPage'))

// Menu links live in a dark floating bar. The active one is a white pill with dark, heavier
// text (shape and weight, not color alone).
const navClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white sm:px-4',
    isActive ? 'bg-white text-body-semibold text-neutral-950' : 'text-body-medium text-white/75 hover:bg-white/10 hover:text-white',
  )

export default function App() {
  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null)
  const openPlan = useCallback(
    (destination?: Place, prompt?: string) => setPlanRequest({ key: Date.now(), destination, prompt }),
    [],
  )
  const tripCount = useLiveQuery(() => db.trips.count(), [])

  // HashRouter so deep links work on static hosts like GitHub Pages without rewrite rules.
  return (
    <AuthProvider>
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
            className="sr-only z-50 rounded-lg bg-background-primary-default px-4 py-2 text-body-semibold text-text-primary shadow-dropdown focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
          >
            Skip to content
          </a>
          {/* Floating menu bar. The zero-height sticky wrapper lets page content (the cobalt bands)
              run underneath it, so every page starts with ~6rem of top padding. */}
          <div className="sticky top-3 z-40 h-0 px-3 sm:top-4">
            <nav
              aria-label="Main"
              className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 rounded-full bg-neutral-950/90 py-2 pl-3.5 pr-2 text-white shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] ring-1 ring-white/10 backdrop-blur-md"
            >
              <Link
                to="/"
                aria-label="Local Trip, home"
                className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Logo className="size-7" />
                <span className="hidden whitespace-nowrap font-display text-title-3-bold tracking-tight min-[420px]:inline">Local Trip</span>
              </Link>
              <div className="flex items-center gap-1">
                <NavLink to="/" end className={navClass}>
                  Discover
                </NavLink>
                <NavLink to="/history" className={navClass}>
                  My trips
                  {!!tripCount && <span className="text-caption-1-semibold tabular-nums opacity-70">{tripCount}</span>}
                </NavLink>
                {/* Global entry point; collapses to an icon on phones so the bar fits at 375 px. */}
                <Button leadingIcon={Plus} onClick={() => openPlan()} aria-label="Plan a trip" className="ml-1 rounded-full sm:pr-3">
                  <span className="hidden sm:inline">Plan a trip</span>
                </Button>
                <ThemeToggle variant="inline" />
                <AuthMenu />
              </div>
            </nav>
          </div>
          <ThemeToggle variant="floating" />
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            <Suspense
              fallback={
                <div className="flex justify-center py-40">
                  <Spinner size="lg" aria-label="Loading trip" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<DiscoverPage />} />
                <Route path="/trip/:id" element={<TripPage />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
            </Suspense>
          </main>
          {/* Footer: dark bookend to the floating menu, with the wordmark at poster size. */}
          <footer className="relative isolate overflow-hidden bg-neutral-950 text-white">
            <TopoArt seed="Local Trip footer" peaks={3} rings={10} className="-z-10 opacity-15" />
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="flex items-center gap-4 text-poster">
                  <Logo className="size-[0.72em] shrink-0" />
                  Local Trip
                </p>
                <p className="mt-4 max-w-sm text-body-regular text-white/70">
                  Weekend escapes from Berkeley, planned in one view. Trips are saved in this browser only.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-10 gap-y-4 text-body-regular">
                <div>
                  <dt className="text-white/55">Built by</dt>
                  <dd className="mt-1">INFO 253A, Group 8</dd>
                </div>
                <div>
                  <dt className="text-white/55">Data from</dt>
                  <dd className="mt-1">Photon, Open-Meteo, Ticketmaster, Nager.Date, OSRM</dd>
                </div>
              </dl>
            </div>
          </footer>
        </div>
        <PlanTripDialog request={planRequest} onClose={() => setPlanRequest(null)} />
      </PlanTripContext.Provider>
      </HashRouter>
    </AuthProvider>
  )
}
