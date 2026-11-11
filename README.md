# Local-Trip
Group 8 final project repo for INFO 253A (Fall 2026): Angel Klyce, Sohamm Joshii, Chesley Guo, Henrik Zabel.

Local Trip helps you plan a short trip without juggling separate weather, events, holiday, route and packing tools. Browse curated ideas on **Discover**, plan a trip, and get one dashboard with everything for those dates. Trips are saved in your browser.

See [PROPOSAL.md](PROPOSAL.md) for the original idea and [README_final_project.md](README_final_project.md) for the course requirements.

## Features

- **Discover** (`#/`): six curated California trips from Berkeley; search, category chips, distance filter and *Surprise me*.
- **Plan a trip** dialog: city autocomplete, date validation (no past dates, return after departure, different cities). Saves before opening the dashboard.
- **Trip dashboard** (`#/trip/:id`): weather (forecast, or last year's weather labeled as such), events, public holidays, map with road route and straight line, driving time, flight estimate, Google Flights / Rome2Rio links, and a packing checklist with weather-based suggestions.
- **My trips** (`#/history`): saved trips newest first, search by city, upcoming/past counts, packing progress, confirmed delete.

## Getting started

```bash
npm install
cp .env.example .env   # then add your Ticketmaster key
npm run dev
```

Open http://localhost:5173. Without a Ticketmaster key everything works; the Events card says it isn't configured.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Strict type-check and build to `dist/` |
| `npm run lint` | Lint with oxlint |

### Environment variables

| Variable | Needed for | Notes |
|---|---|---|
| `VITE_TICKETMASTER_KEY` | Events card | Free key from developer.ticketmaster.com. **Never commit it.** `.env` is gitignored. |

Anything prefixed `VITE_` is compiled into the JavaScript bundle, so the key is visible to anyone using the deployed site. That is acceptable for this course demo; a real product would call Ticketmaster through a server-side proxy.

## APIs and their limits

| Service | Used for | Key | Limits / caveats |
|---|---|---|---|
| [Photon](https://photon.komoot.io) | City autocomplete | none | Public instance is rate limited; we search after 3 characters with a 350 ms debounce. If it's down, curated cities are offered instead. |
| [Open-Meteo](https://open-meteo.com) | Weather | none | Forecast covers 16 days. Later trips show last year's same dates from the archive (labeled *historical*). Trips more than a year out have no data yet. |
| [Ticketmaster Discovery](https://developer.ticketmaster.com) | Events within 50 km | `VITE_TICKETMASTER_KEY` | 5,000 calls/day on the free tier. |
| [Nager.Date](https://date.nager.at) | Public holidays | none | Not every country is covered. Regional holidays are flagged. |
| [OSRM demo server](https://project-osrm.org) | Driving route and time | none | Fair-use demo server, no uptime guarantee. Cities with no road connection show "No road route". |

Every request has a 10-second timeout. Each service loads and fails on its own, so one broken API never blanks the dashboard.

## Data, persistence and privacy

- Trips live in **this browser's IndexedDB** (via Dexie). There are no accounts and no sync: another browser or device won't see them, and clearing site data deletes them.
- API results are cached on the trip with a timestamp, so reopening a trip needs no network. *Refresh data* fetches again; if a service fails, its last successful data stays visible and is marked as saved/stale.
- The packing checklist is stored on the trip. Refreshing data only *adds* new suggestions; your ticks, custom items and removed suggestions are kept.
- API requests send the relevant city coordinates, country code and dates to the providers above. Nothing else leaves the browser.

## Project structure

```
src/
├── api/                # one module per external API, each with a header comment
│   ├── geocode.ts        Photon place search
│   ├── weather.ts        Open-Meteo forecast / archive
│   ├── events.ts         Ticketmaster (throws ConfigError without a key)
│   ├── holidays.ts       Nager.Date
│   ├── route.ts          OSRM driving route
│   ├── distance.ts       straight-line distance (no API)
│   └── index.ts          fetchService(): one service, 10 s timeout → ServiceState
├── components/         # cards, dialogs, filters, map, checklist, transport
├── data/destinations.ts  # curated Discover places
├── lib/                # pure helpers: dates, checklist rules, discover filters, transport, hooks
├── pages/              # DiscoverPage, TripPage, HistoryPage
├── db.ts               # Dexie schema (v3) and transactional writes
└── types.ts            # shared types
```

**How data flows:** the plan dialog saves a `Trip` (with its starting checklist) and opens `#/trip/:id`. `useTripServices` fetches any service missing from `trip.snapshot`, and `saveService()` stores each result as soon as it arrives. Cards render from the saved trip, so they work offline once loaded.

Stack: Vite + React 19 + TypeScript (strict), Tailwind CSS v4, React Router (hash routing for GitHub Pages), Dexie, Recharts, Leaflet, lucide-react.

## Accessibility

Visible labels and focus rings, keyboard-operable autocomplete (↑/↓/Enter/Escape), native modal dialogs (Escape closes, focus is trapped and restored), arrow keys between dashboard tabs, a skip link, reduced-motion support, and no horizontal scrolling from 375 to 1440 px. This has been checked by hand, not formally audited.
