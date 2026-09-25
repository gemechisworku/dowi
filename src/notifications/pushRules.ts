/**
 * What gets synced to the push server (a Vercel API route backed by a
 * small Edge Config store, see api/push/) so it knows *when* to wake this
 * device — never *what* to say or *whether* it's actually still relevant.
 * Deliberately just recurring time-of-day/day-of-week rules plus a short
 * list of upcoming task-due instants: no titles, amounts, notes or streak
 * state ever leave the device. The server pings the device's service
 * worker at roughly the right time; the SW's own `push` handler (src/sw.ts)
 * re-runs the exact same computeDueReminders() logic used for catch-up,
 * against local IndexedDB, to decide content and gating (e.g. whether the
 * evening streak nudge is even still warranted).
 */

import type { Settings, Task } from '@/db/types'

export interface SyncedDailyRule {
  enabled: boolean
  time: string
}

export interface SyncedWeeklyRule {
  enabled: boolean
  day: number
  time: string
}

export interface SyncedReminderRules {
  morningNudge: SyncedDailyRule
  eveningStreak: SyncedDailyRule
  dailyAgenda: SyncedDailyRule
  weeklyPlan: SyncedWeeklyRule
  weeklyReview: SyncedWeeklyRule
  quietHours: { enabled: boolean; start: string; end: string }
  /** ISO 8601 datetimes, soonest first — task-due fire instants over roughly the next two weeks. */
  taskDueAt: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const TASK_DUE_HORIZON_MS = 14 * DAY_MS
/** Small grace window behind "now" so a fire instant a sync just barely missed isn't dropped immediately. */
const TASK_DUE_PAST_GRACE_MS = DAY_MS
const MAX_TASK_DUE_ENTRIES = 100

function buildTaskDueAt(tasks: Task[], taskDueEnabled: boolean, now: Date): string[] {
  if (!taskDueEnabled) return []
  const min = now.getTime() - TASK_DUE_PAST_GRACE_MS
  const max = now.getTime() + TASK_DUE_HORIZON_MS
  const fireTimes: number[] = []
  for (const task of tasks) {
    if (task.status === 'done' || !task.dueAt) continue
    const dueAt = new Date(task.dueAt).getTime()
    for (const offset of task.reminderOffsets) {
      const fireAt = dueAt - offset * 60_000
      if (fireAt >= min && fireAt <= max) fireTimes.push(fireAt)
    }
  }
  fireTimes.sort((a, b) => a - b)
  return fireTimes.slice(0, MAX_TASK_DUE_ENTRIES).map((t) => new Date(t).toISOString())
}

/** Pure — safe to call from the client, and from the service worker's pushsubscriptionchange handler. */
export function buildSyncedReminderRules(
  settings: Settings,
  tasks: Task[],
  now: Date = new Date(),
): SyncedReminderRules {
  const { reminders } = settings
  return {
    morningNudge: { ...reminders.morningNudge },
    eveningStreak: { ...reminders.eveningStreak },
    dailyAgenda: { ...reminders.dailyAgenda },
    weeklyPlan: { ...reminders.weeklyPlan },
    weeklyReview: { ...reminders.weeklyReview },
    quietHours: { ...reminders.quietHours },
    taskDueAt: buildTaskDueAt(tasks, reminders.taskDue.enabled, now),
  }
}
