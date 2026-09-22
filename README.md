# Dowi 도우미

A personal assistant PWA — **money**, **notes**, and **tasks** — that runs entirely on
your own device. No account, no server, no cloud. Android-first, installable, offline.

## Status

**M0–M3 done. M4 (money reports) in progress**, paused mid-milestone on the local,
unmerged `m4-money-reports` branch — see PLAN.md §M4 for exactly what's built
(aggregation + CSV export + the `/money/reports` UI, all unit-tested) and what's left
(share summary, e2e coverage, a full manual pass). Money (`/money`) itself is a real,
usable feature — add/edit/delete income & expenses in any currency, filter and
search, manage categories/sources/accounts/exchange rates. The full component
library is at `/kitchen-sink`; the raw data layer debug panel (superseded by M9's
real Settings UI) is at `/debug/data`. Feature milestones are tracked in
[docs/PLAN.md](docs/PLAN.md).

Chosen design direction: **Option A "Soft Cards"**. Reminders ship as a pure PWA for
now (see PRD §12/OD-1). Defaults: base currency ETB, financial year starts January,
week starts Monday.

## Documents

| Document                                                 | What it is                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                               | Full product requirements — features, data models, acceptance criteria, constraints |
| [docs/PLAN.md](docs/PLAN.md)                             | Milestones M0–M10, each an independently testable deliverable                       |
| [docs/TESTING.md](docs/TESTING.md)                       | Step-by-step verification for every milestone                                       |
| [design/design-options.html](design/design-options.html) | The three UI directions that were compared (Option A chosen)                        |

## Stack

Vite 8 · React 19 · TypeScript (strict) · Tailwind v4 · React Router 7 · Dexie 4 +
`dexie-react-hooks` (IndexedDB) · `vite-plugin-pwa` (Workbox) · Vitest + Testing
Library + `fake-indexeddb` · Playwright (Pixel 7, light + dark) + `@axe-core/playwright`

Tiptap lands in M5 — not needed until then.

## Getting started

```bash
npm install
npm run dev              # http://localhost:5173
```

## Scripts

| Command                            | What it does                            |
| ---------------------------------- | --------------------------------------- |
| `npm run dev`                      | Start the dev server                    |
| `npm run build`                    | Typecheck + production build to `dist/` |
| `npm run preview`                  | Serve the production build locally      |
| `npm run typecheck`                | TypeScript, no emit                     |
| `npm run lint` / `lint:fix`        | ESLint                                  |
| `npm run format` / `format:check`  | Prettier                                |
| `npm run test` / `test:watch`      | Vitest unit/integration tests           |
| `npm run test:e2e` / `test:e2e:ui` | Playwright end-to-end tests             |

A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files.

## Installing on your Android phone

```bash
npm run build
npm run preview -- --host
```

Note the LAN URL Vite prints (e.g. `http://192.168.1.10:4173`) and open it in Chrome
on the phone. Chrome's menu will offer **Add to Home screen** — installing launches
the app standalone (no browser chrome) and it keeps working with Wi-Fi off.

> Push notification testing (M7 onward) needs a secure context, which a plain LAN IP
> doesn't satisfy. See [docs/TESTING.md](docs/TESTING.md) for a tunnelling option.

## Deploying (Vercel)

`vercel.json` at the repo root configures the build for zero-config deploys — connect
the repo at [vercel.com/new](https://vercel.com/new) and it just builds. Nothing about
the app changes: Dowi has no backend and no API calls (PRD D2 — local-only storage
via IndexedDB), so this only gives the app a real HTTPS origin. That matters because
Android's full PWA install (a standalone WebAPK, no browser chrome) is minted
server-side against the origin's actual TLS certificate — the LAN + Chrome-flag
approach above only fakes a secure context locally, so it can't produce a true
standalone install the way a real HTTPS deploy does.

Two things the config exists specifically to get right:

- **SPA fallback** — `rewrites` sends every path to `index.html` (static files still
  take precedence per Vercel's own docs) so a hard refresh on a route like `/settings`
  doesn't 404 before React Router ever loads.
- **Service worker caching** — `sw.js`, `manifest.webmanifest` and `index.html` are
  set `no-cache` so the CDN never serves a stale service worker; this is what makes
  the update flow (`src/app/pwa/UpdatePrompt.tsx`) actually work in production —
  a cached-stale `sw.js` would silently defeat the whole "new SW detected → reload"
  mechanism. Hashed files under `/assets/` are safe to cache immutably forever, since
  Vite gives every build a new filename.

## Project layout

```
src/
  app/
    shell/        top app bar, bottom nav, layout
    theme/        light/dark/system theme provider
  routes/         one folder per top-level screen (home, money, notes, tasks, ...)
  styles/         design tokens + global CSS
  test/           Vitest setup (fake-indexeddb, jest-dom)
e2e/              Playwright specs
docs/             PRD, implementation plan, testing guide
design/           UI design option comparisons
```

## Contributing to this repo (i.e. future you)

- One branch per milestone (`m3-money-capture`, ...), tagged on merge to `main`.
- `main` always builds, lints and passes tests.
- See [docs/PLAN.md](docs/PLAN.md) for what's next and
  [docs/TESTING.md](docs/TESTING.md) for how to verify it.
