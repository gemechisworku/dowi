/**
 * Pure "is it time to wake this device" logic for the sweep endpoint
 * (api/push/sweep.ts). Deliberately its own small implementation rather
 * than importing src/lib/reminders.ts: this only needs to decide whether a
 * push is worth sending at all, never the actual notification content or
 * streak-dependent gating — that stays on-device, decided by the exact
 * same computeDueReminders() the SW's `push` handler re-runs against local
 * IndexedDB. Comparing wall-clock minute-of-day (rather than absolute
 * instants) sidesteps DST entirely: both "now" and each rule's target time
 * are expressed in the device's own local calendar.
 */

import type { PushDeviceEntry, SyncedReminderRules } from './types.js'

export interface LocalNow {
  /** "YYYY-MM-DD" in the device's timezone. */
  isoDate: string
  /** ISO 8601 week, "YYYY-Www", in the device's timezone. */
  isoWeek: string
  /** 0=Sunday..6=Saturday, in the device's timezone. */
  dayOfWeek: number
  /** Minutes since local midnight, 0-1439. */
  minuteOfDay: number
}

const MINUTES_PER_DAY = 24 * 60

function minutesFromHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Shortest distance between two minute-of-day values, wrapping around midnight. */
function minuteDistance(a: number, b: number): number {
  const diff = Math.abs(a - b)
  return Math.min(diff, MINUTES_PER_DAY - diff)
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** ISO 8601 week number (Monday-start, week 1 contains the year's first Thursday). */
function isoWeekString(year: number, month: number, day: number): string {
  const target = new Date(Date.UTC(year, month - 1, day))
  const dayNum = (target.getUTCDay() + 6) % 7 // Monday=0..Sunday=6
  target.setUTCDate(target.getUTCDate() - dayNum + 3) // Thursday of target's own week
  const isoYear = target.getUTCFullYear()
  const jan1 = new Date(Date.UTC(isoYear, 0, 1))
  const week1Thursday = new Date(Date.UTC(isoYear, 0, 1 + ((4 - jan1.getUTCDay() + 7) % 7)))
  const week = 1 + Math.round((target.getTime() - week1Thursday.getTime()) / (7 * 86_400_000))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function getLocalNow(now: Date, timeZone: string): LocalNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  // formatToParts can render midnight's hour as "24" under hour12: false.
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  const weekday = get('weekday')

  return {
    isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    isoWeek: isoWeekString(year, month, day),
    dayOfWeek: WEEKDAY_INDEX[weekday] ?? 0,
    minuteOfDay: hour * 60 + minute,
  }
}

export function isTimeDueNow(targetHm: string, local: LocalNow, toleranceMinutes: number): boolean {
  return minuteDistance(local.minuteOfDay, minutesFromHm(targetHm)) <= toleranceMinutes
}

function isInQuietHours(quietHours: SyncedReminderRules['quietHours'], local: LocalNow): boolean {
  if (!quietHours.enabled) return false
  const start = minutesFromHm(quietHours.start)
  const end = minutesFromHm(quietHours.end)
  if (start === end) return false
  if (start < end) return local.minuteOfDay >= start && local.minuteOfDay < end
  return local.minuteOfDay >= start || local.minuteOfDay < end
}

export interface DueResult {
  due: boolean
  /** Only the keys that actually matched — merge into the device's stored lastFired, don't replace it. */
  firedUpdates: Partial<PushDeviceEntry['lastFired']>
}

const TOLERANCE_MINUTES = 2
const TASK_DUE_TOLERANCE_MS = 2 * 60_000

/** True once a device's rules say it's worth waking it right now, and which lastFired entries that implies. */
export function isDeviceDueNow(entry: PushDeviceEntry, now: Date): DueResult {
  const { rules, lastFired } = entry
  const local = getLocalNow(now, entry.timeZone)

  if (isInQuietHours(rules.quietHours, local)) {
    return { due: false, firedUpdates: {} }
  }

  const firedUpdates: Partial<PushDeviceEntry['lastFired']> = {}

  if (
    rules.morningNudge.enabled &&
    isTimeDueNow(rules.morningNudge.time, local, TOLERANCE_MINUTES) &&
    lastFired.morningNudge !== local.isoDate
  ) {
    firedUpdates.morningNudge = local.isoDate
  }

  if (
    rules.eveningStreak.enabled &&
    isTimeDueNow(rules.eveningStreak.time, local, TOLERANCE_MINUTES) &&
    lastFired.eveningStreak !== local.isoDate
  ) {
    firedUpdates.eveningStreak = local.isoDate
  }

  if (
    rules.dailyAgenda.enabled &&
    isTimeDueNow(rules.dailyAgenda.time, local, TOLERANCE_MINUTES) &&
    lastFired.dailyAgenda !== local.isoDate
  ) {
    firedUpdates.dailyAgenda = local.isoDate
  }

  if (
    rules.weeklyPlan.enabled &&
    rules.weeklyPlan.day === local.dayOfWeek &&
    isTimeDueNow(rules.weeklyPlan.time, local, TOLERANCE_MINUTES) &&
    lastFired.weeklyPlan !== local.isoWeek
  ) {
    firedUpdates.weeklyPlan = local.isoWeek
  }

  if (
    rules.weeklyReview.enabled &&
    rules.weeklyReview.day === local.dayOfWeek &&
    isTimeDueNow(rules.weeklyReview.time, local, TOLERANCE_MINUTES) &&
    lastFired.weeklyReview !== local.isoWeek
  ) {
    firedUpdates.weeklyReview = local.isoWeek
  }

  const alreadyFiredTaskAt = new Set(lastFired.taskDueAt ?? [])
  const dueTaskAt = rules.taskDueAt.filter((iso) => {
    if (alreadyFiredTaskAt.has(iso)) return false
    return Math.abs(now.getTime() - new Date(iso).getTime()) <= TASK_DUE_TOLERANCE_MS
  })
  if (dueTaskAt.length > 0) {
    firedUpdates.taskDueAt = [...(lastFired.taskDueAt ?? []), ...dueTaskAt]
  }

  return { due: Object.keys(firedUpdates).length > 0, firedUpdates }
}
