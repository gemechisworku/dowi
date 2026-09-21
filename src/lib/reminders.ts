/**
 * Pure computation for M7's reminder scheduler (PRD §5.7): given the current
 * settings, tasks and the notifications already recorded, decides which
 * reminders are newly due right now. Deliberately dependency-free (no
 * IndexedDB, no Notification API) so the exact same logic runs on the main
 * thread, inside the service worker's periodicsync handler, and under
 * Vitest without mocking anything.
 */

import type { AppNotification, NotificationType, ReminderConfig, Settings, Task } from '@/db/types'

export interface DueReminder {
  type: NotificationType
  title: string
  body: string
  /** ISO 8601 datetime. */
  scheduledFor: string
  deepLink?: string
}

export interface ComputeDueRemindersInput {
  settings: Settings
  tasks: Task[]
  now: Date
  /** Already-created notifications, used to avoid raising the same occurrence twice. */
  existing: AppNotification[]
  /** When the app was first used — the baseline for the very first backup nudge. */
  installedAt: string
  /**
   * How far back a missed reminder is still worth catching up on (AC-P2).
   * A reminder older than this is treated as missed and silently skipped
   * rather than resurrected, so re-opening the app after months away
   * doesn't dump a huge backlog into the inbox. Not applied to the backup
   * nudge, which is deliberately allowed to remain due indefinitely until
   * either a real export happens or it fires.
   */
  catchUpWindowMs?: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_CATCH_UP_WINDOW_MS = 3 * DAY_MS

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number)
  return { hours: h ?? 0, minutes: m ?? 0 }
}

/** The most recent moment matching `day` (0=Sun..6=Sat) + `time` at or before `from`. */
function mostRecentWeeklyOccurrence(day: number, time: string, from: Date): Date {
  const { hours, minutes } = parseTime(time)
  const candidate = new Date(from)
  for (let back = 0; back < 7; back++) {
    candidate.setDate(from.getDate() - back)
    candidate.setHours(hours, minutes, 0, 0)
    if (candidate.getDay() === day && candidate.getTime() <= from.getTime()) {
      return candidate
    }
  }
  /* istanbul ignore next -- unreachable: day is always 0-6, so the loop above always finds a match within 7 days */
  return candidate
}

/** The most recent moment matching `time`, today if it's already passed, otherwise yesterday. */
function mostRecentDailyOccurrence(time: string, from: Date): Date {
  const { hours, minutes } = parseTime(time)
  const candidate = new Date(from)
  candidate.setHours(hours, minutes, 0, 0)
  if (candidate.getTime() > from.getTime()) {
    candidate.setDate(candidate.getDate() - 1)
  }
  return candidate
}

/** Handles both same-day ranges (07:00–09:00) and overnight ranges (22:00–07:00). */
export function isWithinQuietHours(date: Date, quietHours: ReminderConfig['quietHours']): boolean {
  if (!quietHours.enabled) return false
  const { hours: startH, minutes: startM } = parseTime(quietHours.start)
  const { hours: endH, minutes: endM } = parseTime(quietHours.end)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  if (startMinutes === endMinutes) return false
  const nowMinutes = date.getHours() * 60 + date.getMinutes()
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes
}

function alreadyExists(
  existing: AppNotification[],
  type: NotificationType,
  scheduledFor: string,
  deepLink: string | undefined,
): boolean {
  return existing.some(
    (n) => n.type === type && n.scheduledFor === scheduledFor && n.deepLink === deepLink,
  )
}

function formatOffsetLabel(minutes: number): string {
  if (minutes <= 0) return 'now'
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr`
  const days = Math.round(minutes / 1440)
  return `${days} day${days === 1 ? '' : 's'}`
}

export function computeDueReminders({
  settings,
  tasks,
  now,
  existing,
  installedAt,
  catchUpWindowMs = DEFAULT_CATCH_UP_WINDOW_MS,
}: ComputeDueRemindersInput): DueReminder[] {
  const due: DueReminder[] = []
  const cutoff = now.getTime() - catchUpWindowMs
  const { reminders } = settings

  function withinCatchUpWindow(time: Date): boolean {
    return time.getTime() <= now.getTime() && time.getTime() > cutoff
  }

  if (reminders.weeklyPlan.enabled) {
    const occurrence = mostRecentWeeklyOccurrence(
      reminders.weeklyPlan.day,
      reminders.weeklyPlan.time,
      now,
    )
    const scheduledFor = occurrence.toISOString()
    if (
      withinCatchUpWindow(occurrence) &&
      !alreadyExists(existing, 'weekly-plan', scheduledFor, '/tasks/plan')
    ) {
      due.push({
        type: 'weekly-plan',
        title: 'Plan your week',
        body: 'Set your tasks for the week ahead.',
        scheduledFor,
        deepLink: '/tasks/plan',
      })
    }
  }

  if (reminders.weeklyReview.enabled) {
    const occurrence = mostRecentWeeklyOccurrence(
      reminders.weeklyReview.day,
      reminders.weeklyReview.time,
      now,
    )
    const scheduledFor = occurrence.toISOString()
    if (
      withinCatchUpWindow(occurrence) &&
      !alreadyExists(existing, 'weekly-review', scheduledFor, '/tasks/review')
    ) {
      due.push({
        type: 'weekly-review',
        title: 'Review your week',
        body: 'See what got done and reflect on it.',
        scheduledFor,
        deepLink: '/tasks/review',
      })
    }
  }

  if (reminders.dailyAgenda.enabled) {
    const occurrence = mostRecentDailyOccurrence(reminders.dailyAgenda.time, now)
    const scheduledFor = occurrence.toISOString()
    if (
      withinCatchUpWindow(occurrence) &&
      !alreadyExists(existing, 'daily-agenda', scheduledFor, '/tasks')
    ) {
      due.push({
        type: 'daily-agenda',
        title: "Today's agenda",
        body: "Here's what's on today.",
        scheduledFor,
        deepLink: '/tasks',
      })
    }
  }

  if (reminders.taskDue.enabled) {
    for (const task of tasks) {
      if (task.status === 'done' || !task.dueAt) continue
      const dueAt = new Date(task.dueAt)
      for (const offset of task.reminderOffsets) {
        const fireAt = new Date(dueAt.getTime() - offset * 60_000)
        const scheduledFor = fireAt.toISOString()
        const deepLink = `/tasks?taskId=${task.id}`
        if (
          withinCatchUpWindow(fireAt) &&
          !alreadyExists(existing, 'task-due', scheduledFor, deepLink)
        ) {
          due.push({
            type: 'task-due',
            title: task.title,
            body: offset === 0 ? 'Due now' : `Due in ${formatOffsetLabel(offset)}`,
            scheduledFor,
            deepLink,
          })
        }
      }
    }
  }

  if (reminders.backupNudge.enabled) {
    const lastNudge = existing
      .filter((n) => n.type === 'backup-nudge')
      .map((n) => n.scheduledFor)
      .sort()
      .at(-1)
    const baseline =
      settings.lastBackupAt && (!lastNudge || settings.lastBackupAt > lastNudge)
        ? settings.lastBackupAt
        : (lastNudge ?? installedAt)
    const dueAt = new Date(
      new Date(baseline).getTime() + reminders.backupNudge.intervalDays * DAY_MS,
    )
    const scheduledFor = dueAt.toISOString()
    if (
      dueAt.getTime() <= now.getTime() &&
      !alreadyExists(existing, 'backup-nudge', scheduledFor, '/settings')
    ) {
      due.push({
        type: 'backup-nudge',
        title: 'Back up your data',
        body: `It's been ${reminders.backupNudge.intervalDays} days since your last export.`,
        scheduledFor,
        deepLink: '/settings',
      })
    }
  }

  return due
}
