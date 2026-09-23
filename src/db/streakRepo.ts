import type { DowiDatabase } from './db'
import { todayString } from '@/lib/period'

/**
 * Daily-use streak (not part of the M7 plan/review reminder system's "no
 * streaks, no guilt UI" stance — that's specifically about not nagging over
 * the weekly plan/review ritual; this is a separate, opt-in, celebratory
 * mechanic). Stored as a second row in the existing `meta` table (keyed
 * `&key`, same as `seededAt`) — a small JSON blob rather than a new Dexie
 * table, since it's a single running counter, not per-day records that
 * need to be individually queried.
 */
export const STREAK_META_KEY = 'streak'

export interface StreakState {
  currentStreak: number
  longestStreak: number
  /** Local "YYYY-MM-DD" of the most recent qualifying action, or null before the first one. */
  lastActiveDate: string | null
  /** The highest `currentStreak` a celebration has already been shown for, so a 7/14/21-day milestone only celebrates once. */
  lastCelebratedStreak: number
  /** The last "YYYY-MM-DD" the lightweight daily reward overlay was shown for, so it only appears once per day. */
  lastDailyBadgeShownDate?: string | null
}

export const DEFAULT_STREAK_STATE: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  lastCelebratedStreak: 0,
  lastDailyBadgeShownDate: null,
}

function parseStreakValue(value: string | undefined): StreakState {
  if (!value) return DEFAULT_STREAK_STATE
  try {
    const parsed = JSON.parse(value) as Partial<StreakState>
    return {
      currentStreak: parsed.currentStreak ?? 0,
      longestStreak: parsed.longestStreak ?? 0,
      lastActiveDate: parsed.lastActiveDate ?? null,
      lastCelebratedStreak: parsed.lastCelebratedStreak ?? 0,
      lastDailyBadgeShownDate: parsed.lastDailyBadgeShownDate ?? null,
    }
  } catch {
    return DEFAULT_STREAK_STATE
  }
}

/** A "YYYY-MM-DD" string one calendar day before `date`. */
function previousDateString(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const local = new Date(y as number, (m as number) - 1, (d as number) - 1)
  const yy = local.getFullYear()
  const mm = String(local.getMonth() + 1).padStart(2, '0')
  const dd = String(local.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * Pure state transition for "a qualifying action happened on `today`" —
 * exported separately from the repo so the streak/consecutive-day/reset
 * logic is unit-testable without touching IndexedDB.
 */
export function applyQualifyingActivity(state: StreakState, today: string): StreakState {
  if (state.lastActiveDate === today) return state // already recorded today — no-op, not a double-count
  const isConsecutive = state.lastActiveDate === previousDateString(today)
  const currentStreak = isConsecutive ? state.currentStreak + 1 : 1
  return {
    ...state,
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastActiveDate: today,
  }
}

/** True once `state.currentStreak` has reached a new (not yet celebrated) multiple of 7. */
export function isNewMilestone(state: StreakState): boolean {
  return (
    state.currentStreak > 0 &&
    state.currentStreak % 7 === 0 &&
    state.currentStreak > state.lastCelebratedStreak
  )
}

/**
 * True when the lightweight daily reward overlay (StreakDailyOverlay) should
 * show: the user has been active *today* and hasn't seen today's badge yet.
 * Deliberately independent of the exact moment the streak incremented —
 * "shown when they open the app" is satisfied by showing it on any open
 * that day, not just the one immediately after the qualifying action.
 * Milestone days defer entirely to the bigger `StreakCelebrationOverlay` —
 * no double celebration on the same day.
 */
export function shouldShowDailyOverlay(state: StreakState, today: string): boolean {
  return (
    state.lastActiveDate === today &&
    state.lastDailyBadgeShownDate !== today &&
    !isNewMilestone(state)
  )
}

export function createStreakRepo(db: DowiDatabase) {
  return {
    async get(): Promise<StreakState> {
      const row = await db.meta.get(STREAK_META_KEY)
      return parseStreakValue(row?.value)
    },

    /** Records "the user added an income/expense/note/task today" — a no-op if already recorded for today. */
    async recordQualifyingActivity(today: string = todayString()): Promise<StreakState> {
      const current = await this.get()
      const next = applyQualifyingActivity(current, today)
      if (next === current) return current
      await db.meta.put({ key: STREAK_META_KEY, value: JSON.stringify(next) })
      return next
    },

    /** Marks a milestone as shown, so `isNewMilestone` stops reporting it after the celebration is dismissed. */
    async markCelebrated(streakValue: number): Promise<StreakState> {
      const current = await this.get()
      const next: StreakState = { ...current, lastCelebratedStreak: streakValue }
      await db.meta.put({ key: STREAK_META_KEY, value: JSON.stringify(next) })
      return next
    },

    /** Marks today's daily reward overlay as shown, so `shouldShowDailyOverlay` stops reporting it for the rest of the day. */
    async markDailyBadgeShown(today: string = todayString()): Promise<StreakState> {
      const current = await this.get()
      const next: StreakState = { ...current, lastDailyBadgeShownDate: today }
      await db.meta.put({ key: STREAK_META_KEY, value: JSON.stringify(next) })
      return next
    },
  }
}

export type StreakRepo = ReturnType<typeof createStreakRepo>
