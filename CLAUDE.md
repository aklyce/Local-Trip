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

## Decisions already made

- **No login / backend.** Not required; Dexie (IndexedDB) satisfies persistence. If ever revisited: Supabase Auth (P2).
- **P0 still to build:** preparation checklist on the dashboard (FR-15 to FR-18): rule-based items from weather + trip, user can tick/add/delete, stored on the trip, progress like "7 / 12 packed" in the header.
- **P1:** transportation card (FR-12 to FR-14): OSRM driving time/distance, flight estimate (distance ÷ 800 km/h + 2 h) when driving > 8 h, Google Flights and Rome2Rio links.
- **P2 / deferred:** nearby attractions (OpenTripMap), WebLLM trip variants (needs WebGPU, too risky to demo), user reviews.
- New dashboard row (checklist + transportation) goes below the Weather card; existing layout stays.
- Adding `checklist` and `snapshot.route` to `Trip` requires a Dexie `version(2)` schema bump in `src/db.ts`.

## Stack and conventions

- Vite + React 19 + TypeScript, Tailwind CSS v4, React Router (hash routing for GitHub Pages), Dexie, Recharts, Leaflet, lucide-react.
- One module per external API in `src/api/`; `fetchSnapshot()` in `src/api/index.ts` calls them in parallel.
- Each dashboard section is a `Section<T>` (`{ ok, data } | { ok: false, error }`) so one failing API never blanks the page. Keep this pattern for new cards.
- API results are cached on the trip as `snapshot`; "Refresh data" refetches.
- Code must be well commented (course Part III): short header comment per API module and page.
- Before saying work is done: `npm run build` and `npm run lint` must pass.
- Note: `tsconfig.app.json` does not set `strict` yet, although PRD NFR-6 expects strict mode.

## Working with the user

- The user writes in Chinese; reply in Chinese. Project documents (PRD, README, LEARNINGS.md, slides) are written in English.
- Four people push to one public repo: use feature branches and small commits; don't commit or push unless asked.
