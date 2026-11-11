import { Compass } from 'lucide-react'
import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import HistoryPage from './pages/HistoryPage'
import PlanPage from './pages/PlanPage'
import TripPage from './pages/TripPage'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
  }`

export default function App() {
  // HashRouter so deep links work on static hosts like GitHub Pages without rewrite rules.
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col">
        <nav className="sticky top-0 z-[1100] border-b border-line/70 bg-paper/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-accent text-white">
                <Compass className="size-5" />
              </span>
              <span className="font-display text-xl font-semibold text-ink">Local Trip</span>
            </Link>
            <div className="flex gap-1">
              <NavLink to="/" end className={navClass}>
                Plan
              </NavLink>
              <NavLink to="/history" className={navClass}>
                My trips
              </NavLink>
            </div>
          </div>
        </nav>
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<PlanPage />} />
            <Route path="/trip/:id" element={<TripPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
        <footer className="border-t border-line py-6 text-center text-xs text-ink-muted">
          Local Trip · INFO 253 Group 8 · Data from Photon, Open-Meteo, Ticketmaster &amp; Nager.Date
        </footer>
      </div>
    </HashRouter>
  )
}
