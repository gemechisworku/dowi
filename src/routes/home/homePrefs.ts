/**
 * Home's money-summary period toggle (Week/Month/Year — no "Day", unlike
 * Reports' own PeriodSelector), persisted across restarts (PRD AC-H2). Same
 * localStorage try/catch pattern M5 established for its own view-state
 * toggles — see `src/routes/notes/notePrefs.ts` — reserving the Dexie
 * `settings` table for data that actually needs to travel with backup/export.
 */

export type HomePeriod = 'week' | 'month' | 'year'

const PERIOD_KEY = 'dowi:home:period'

export function readHomePeriod(): HomePeriod {
  try {
    const raw = localStorage.getItem(PERIOD_KEY)
    if (raw === 'week' || raw === 'month' || raw === 'year') return raw
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back silently
  }
  return 'month'
}

export function writeHomePeriod(period: HomePeriod): void {
  try {
    localStorage.setItem(PERIOD_KEY, period)
  } catch {
    // ignore persistence failures
  }
}
