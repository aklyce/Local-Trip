# CLAUDE.md

Context for Claude Code sessions in this repo. Keep it short and current; update it when a decision changes.

## Project

Local Trip — INFO 253A (Fall 2026) group project, Group 8: Angel Klyce, Sohamm Joshii, Chesley Guo, Henrik Zabel.
User enters origin, destination and dates → gets a trip dashboard (weather, events, holidays, distance/map, transportation, packing checklist). Trips are saved in the browser and can be searched on a History page.

- Course requirements: [README_final_project.md](README_final_project.md)
- Proposal: [PROPOSAL.md](PROPOSAL.md)
- PRD (source of truth for scope, requirement IDs FR-x / NFR-x, timeline): https://claude.ai/artifact/TJ48nMizio8mbaJChweaKe
- Setup, commands and folder layout: [README.md](README.md)

## Deadlines

- Mon **Nov 30, 2026, 9:00 AM PT**: all code + `LEARNINGS.md` pushed; in-person demo the same day (10 min, ≤ 5 slides, one slide lists functionality in bullets).
- Planned internal dates (from PRD): checklist done Nov 15, transportation card Nov 20, scope freeze Nov 22, fallback demo recording Nov 27.

## Grading facts that drive decisions

- Only the front end is graded. Must use React, ≥ 1 external API, and persist user data (localStorage/IndexedDB is enough).
- 40 of 100 points = the live demo matching the slides. **Reliability beats feature count.**
- No API keys in the repo. `.env` is gitignored; `VITE_TICKETMASTER_KEY` is shared privately.

## Discovery redesign (PRD v2, in progress on `feature/discovery-redesign`)

Angel's PRD v2 ("Local Trip — Discovery Redesign") + prototype (https://local-trip-discover-angel.aklyce.chatgpt.site/) are the target design. Approach: keep this repo's APIs, per-service card states, Dexie, Recharts chart and Leaflet map; port the prototype's look, Discover page and shared plan dialog; add checklist and transport.

- Phases: 0 tokens/fonts + baseline commit (done) → 1 Discover + `PlanTripDialog` (done; photos still missing in `public/images/`, cards fall back to gradients) → 2 checklist (Dexie v2) (done; rules in `src/lib/checklist.ts`, writes via `saveSnapshot`/`editTrip` in `src/db.ts` so refresh never overwrites edits) → 3 dashboard restyle, per-service stale snapshots, 10 s timeouts, transport, history (done) → 4 strict TS, responsive/keyboard checks, scope freeze Nov 22.
- Proposed defaults (team still to confirm): keep numeric `++id` (no UUID migration); Discover = 6 curated California places, origin fixed to Berkeley; keep `VITE_TICKETMASTER_KEY` in the browser and say so in README; owners unassigned.
- Visual tokens live in `src/index.css` `@theme` (PRD VIS-2 palette, Libre Caslon Display + DM Sans). Use token classes, not hex values.

## Decisions already made

- **No login / backend.** Not required; Dexie (IndexedDB) satisfies persistence. If ever revisited: Supabase Auth (P2).
- **Checklist (FR-15 to FR-18):** done in phase 2. Removed suggestions are remembered in `dismissedSuggestions`.
- **Transportation (FR-12 to FR-14):** done in phase 3. OSRM snaps unreachable cities onto another continent's roads, so `route.ts` treats a snap > 25 km as "no road route". Google Flights prefills dates via its `q=` search; Rome2Rio can't.
- **P2 / deferred:** nearby attractions (OpenTripMap), WebLLM trip variants (needs WebGPU, too risky to demo), user reviews.
- New dashboard row (checklist + transportation) goes below the Weather card; existing layout stays.

## Stack and conventions

- Vite + React 19 + TypeScript, Tailwind CSS v4, React Router (hash routing for GitHub Pages), Dexie, Recharts, Leaflet, lucide-react.
- One module per external API in `src/api/` (weather, events, holidays, route = OSRM, geocode). `fetchService(key, trip)` in `src/api/index.ts` runs one with a 10 s timeout; `useTripServices` loads them independently and `saveService` in `src/db.ts` stores each result.
- Each service is cached on `trip.snapshot[key]` as a `ServiceState<T>` (`status`, last successful `data`, `fetchedAt`, `error`). A failed refresh keeps old data and the card shows it as stale. Render new cards with `ServiceCard`. Missing API keys throw `ConfigError` → `unconfigured` (neutral message).
- Dexie is at `version(3)` (v3 converted old `{ ok, data }` snapshots).
- Code must be well commented (course Part III): short header comment per API module and page.
- Before saying work is done: `npm run build` and `npm run lint` must pass.
- Note: `tsconfig.app.json` does not set `strict` yet, although PRD NFR-6 expects strict mode.

## Working with the user

- The user writes in Chinese; reply in Chinese. Project documents (PRD, README, LEARNINGS.md, slides) are written in English.
- Four people push to one public repo: use feature branches and small commits; don't commit or push unless asked.
