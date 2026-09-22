/**
 * Two small view-state toggles (grouping mode, card/list density) persisted
 * across sessions. Deliberately localStorage, not the Dexie `settings`
 * table — every prior milestone that needed a small persisted UI toggle
 * used localStorage (see `ThemeProvider`'s `dowi:theme` key), reserving the
 * settings table for actual user data/preferences that sync with backup.
 */

export type NoteGroupingMode = 'date' | 'collection'
export type NoteDensity = 'list' | 'card'

const GROUPING_KEY = 'dowi:notes:grouping'
const DENSITY_KEY = 'dowi:notes:density'

export function readGroupingMode(): NoteGroupingMode {
  try {
    const raw = localStorage.getItem(GROUPING_KEY)
    if (raw === 'date' || raw === 'collection') return raw
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back silently
  }
  return 'date'
}

export function writeGroupingMode(mode: NoteGroupingMode): void {
  try {
    localStorage.setItem(GROUPING_KEY, mode)
  } catch {
    // ignore persistence failures
  }
}

export function readDensity(): NoteDensity {
  try {
    const raw = localStorage.getItem(DENSITY_KEY)
    if (raw === 'list' || raw === 'card') return raw
  } catch {
    // localStorage unavailable
  }
  return 'list'
}

export function writeDensity(density: NoteDensity): void {
  try {
    localStorage.setItem(DENSITY_KEY, density)
  } catch {
    // ignore persistence failures
  }
}
