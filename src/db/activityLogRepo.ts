import type { DowiDatabase } from './db'
import type { ActivityLogEntry } from './types'
import { todayString } from '@/lib/period'

/**
 * Per-day qualifying-activity history for the streak page's contribution
 * calendar (M13) — recorded alongside (not instead of) streakRepo.ts's own
 * running counter, from the same trigger points (repositories.ts's
 * notes/tasks/transactions `.create()`). Unlike the streak counter, this
 * still increments on a second/third qualifying action the same day —
 * that's what gives the calendar's shading its "how much", not just
 * "whether".
 */
export function createActivityLogRepo(db: DowiDatabase) {
  return {
    async record(today: string = todayString()): Promise<void> {
      const existing = await db.activityLog.get(today)
      await db.activityLog.put({ date: today, count: (existing?.count ?? 0) + 1 })
    },

    /** Every logged day, in no particular order — callers index it themselves (see MonthActivityCalendar). */
    async list(): Promise<ActivityLogEntry[]> {
      return db.activityLog.toArray()
    },
  }
}

export type ActivityLogRepo = ReturnType<typeof createActivityLogRepo>
