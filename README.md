# Dowi 도우미

A personal assistant PWA — **money**, **notes**, and **tasks** — that runs entirely on
your own device. No account, no server, no cloud. Android-first, installable, offline.

## Status

Planning. No application code yet. The design direction (`design/design-options.html`)
and the reminder-reliability decision (PRD §12) are pending review.

## Documents

| Document | What it is |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Full product requirements — features, data models, acceptance criteria, constraints |
| [docs/PLAN.md](docs/PLAN.md) | Milestones M0–M10, each an independently testable deliverable |
| [docs/TESTING.md](docs/TESTING.md) | Step-by-step verification for every milestone |
| [design/design-options.html](design/design-options.html) | Three UI directions to choose between — open in a browser |

## Planned stack

Vite 6 · React 19 · TypeScript · Tailwind v4 · React Router 7 · Dexie 4 (IndexedDB) ·
Tiptap 3 · `vite-plugin-pwa` · Vitest · Playwright

## Viewing the design options

```bash
open design/design-options.html     # macOS
```
Or serve the folder and open it on your phone:
```bash
npx serve . -l 4000        # then visit http://<your-lan-ip>:4000/design/design-options.html
```
