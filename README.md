# Local-Trip
Group 8 final project repo for Info 253

See [PROPOSAL.md](PROPOSAL.md) for the project idea.

## Getting started

```bash
npm install
cp .env.example .env   # then add your Ticketmaster key
npm run dev
```

Open http://localhost:5173. Without a Ticketmaster key, everything works except the Events card.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint with oxlint |

## Project structure

```
src/
├── api/            # one module per external API
│   ├── geocode.ts    Photon — place search / coordinates
│   ├── weather.ts    Open-Meteo — forecast, or last year's data if dates are >16 days out
│   ├── events.ts     Ticketmaster Discovery — needs VITE_TICKETMASTER_KEY
│   ├── holidays.ts   Nager.Date — public holidays
│   ├── distance.ts   straight-line distance (no API)
│   └── index.ts      fetchSnapshot(): calls all of the above in parallel
├── components/     # LocationInput (autocomplete), Card
├── pages/          # PlanPage (form), TripPage (dashboard), HistoryPage
├── db.ts           # Dexie / IndexedDB — saved trips
└── types.ts        # shared types
```

**How data flows:** the Plan form saves a `Trip` to IndexedDB, then opens `/trip/:id`. The dashboard fetches every API once, stores the result on the trip as `snapshot`, and reads from that cache after that ("Refresh data" fetches again). Each API section stores its own success or error, so if one API fails the others still show.

Stack: Vite + React + TypeScript, Tailwind CSS, React Router (hash routing, so it works on GitHub Pages), Dexie.

## TODO
- Weather chart (e.g. Recharts) instead of the list
- Map of origin → destination (e.g. Leaflet)
- Driving distance/time via OSRM
- WebLLM trip suggestions (load only when the user asks; requires WebGPU)
