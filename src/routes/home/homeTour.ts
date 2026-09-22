/**
 * Persistence for Home's brief "getting started" callout (shown only while
 * there's no data at all). Same localStorage try/catch shape as
 * `homeBanner.ts`'s dismiss, but **permanent** rather than per-day — once a
 * person closes it, it never comes back, even if they later delete
 * everything and are back at zero data. The more common path out of it is
 * simply adding a first transaction/task/note, which HomePage.tsx gates on
 * separately (`hasNoData` going false) without needing this flag set at all.
 */

const DISMISS_KEY = 'dowi:home:tourDismissed'

export function isTourDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissTour(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // ignore persistence failures
  }
}
