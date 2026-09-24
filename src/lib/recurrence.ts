/**
 * Pure computation for recurring transactions (PRD §9's "recurring
 * transactions" feature): the date math for when an occurrence falls, and
 * given the current templates/transactions/notifications, which occurrences
 * are newly due right now. Deliberately dependency-free (no IndexedDB, no
 * Notification API) so the exact same logic runs in the catch-up scheduler
 * and under Vitest without mocking anything — see `src/lib/reminders.ts`,
 * which this mirrors in shape and philosophy.
 */

import type {
  AppNotification,
  RecurrenceInterval,
  RecurringTransaction,
  Transaction,
} from '@/db/types'

const DEFAULT_MAX_BACKFILL = 60

/** Local "YYYY-MM-DD" for `d` — hand-rolled rather than imported from `@/lib/period` (whose parse/format helpers aren't exported) so this file stays free of any runtime dependency, same rationale as reminders.ts's own toLocalDateString. */
function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y as number, (m as number) - 1, d as number)
}

/** The number of days in `month` (0-indexed, JS Date convention) of `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * The date of the `index`th occurrence (0-based) counting from `anchor`.
 *
 * For `week`, this is simple day arithmetic. For `month`/`year`, the target
 * month/year is always computed fresh from the *original* anchor's
 * year/month/day, never chained from a previous (possibly clamped)
 * occurrence — chaining would cause permanent drift: e.g. a monthly
 * recurrence anchored on Jan 31 would go Jan 31 -> Feb 28 -> Mar 28 (wrong,
 * chained from the clamped Feb 28) instead of the correct Jan 31 -> Feb 28
 * -> Mar 31 (each computed independently from Jan 31, clamping only that
 * month's own day count). Only the day-of-month is ever clamped, to
 * `min(anchorDay, daysInTargetMonth)`. `year` uses the same logic with the
 * month held fixed, which is what makes Feb 29 -> Feb 28 (non-leap target
 * year) fall out for free.
 */
export function occurrenceAt(anchor: string, interval: RecurrenceInterval, index: number): string {
  const anchorDate = parseDateString(anchor)

  if (interval.unit === 'week') {
    const result = new Date(anchorDate)
    result.setDate(anchorDate.getDate() + interval.every * 7 * index)
    return toDateString(result)
  }

  const anchorYear = anchorDate.getFullYear()
  const anchorMonth = anchorDate.getMonth() // 0-indexed
  const anchorDay = anchorDate.getDate()

  let targetYear: number
  let targetMonth: number
  if (interval.unit === 'month') {
    const totalMonths = anchorMonth + interval.every * index
    targetYear = anchorYear + Math.floor(totalMonths / 12)
    targetMonth = ((totalMonths % 12) + 12) % 12
  } else {
    // year: month stays fixed, only the year advances.
    targetYear = anchorYear + interval.every * index
    targetMonth = anchorMonth
  }

  const clampedDay = Math.min(anchorDay, daysInMonth(targetYear, targetMonth))
  return toDateString(new Date(targetYear, targetMonth, clampedDay))
}

/** e.g. "Weekly", "Every 2 weeks", "Monthly", "Every 3 months", "Yearly". */
export function formatIntervalLabel(interval: RecurrenceInterval): string {
  const { unit, every } = interval
  const noun = unit === 'week' ? 'week' : unit === 'month' ? 'month' : 'year'
  if (every === 1) {
    return unit === 'week' ? 'Weekly' : unit === 'month' ? 'Monthly' : 'Yearly'
  }
  return `Every ${every} ${noun}s`
}

export interface ComputeDueRecurringInput {
  /** Caller pre-filters to !paused && !deletedAt. */
  templates: RecurringTransaction[]
  existingTransactions: Pick<Transaction, 'recurringId' | 'date'>[]
  /** For 'recurring-due' dedup. */
  existingNotifications: AppNotification[]
  /** Local "YYYY-MM-DD". */
  today: string
  /** How many occurrences to walk forward per template before giving up — a safety cap against a runaway loop for a very old/misconfigured template. Default 60. */
  maxBackfill?: number
}

export interface AutoRecordBatch {
  template: RecurringTransaction
  /** Dates to create, oldest to newest. */
  occurrences: string[]
  finalOccurrenceIndex: number
  finalNextDueDate: string
  finalLastGeneratedDate: string
}

export interface RemindDue {
  template: RecurringTransaction
  dueDate: string
  title: string
  body: string
  /** ISO 8601 datetime. */
  scheduledFor: string
  deepLink: string
}

export interface DueRecurringResult {
  autoRecord: AutoRecordBatch[]
  remind: RemindDue[]
}

function alreadyNotified(
  existingNotifications: AppNotification[],
  scheduledFor: string,
  deepLink: string,
): boolean {
  return existingNotifications.some(
    (n) => n.type === 'recurring-due' && n.scheduledFor === scheduledFor && n.deepLink === deepLink,
  )
}

/** Every date >= startDate at occurrenceIndex..occurrenceIndex+maxBackfill-1 that is due (<= today, and <= endDate if set), oldest first. */
function dueOccurrencesFor(
  template: RecurringTransaction,
  today: string,
  maxBackfill: number,
): string[] {
  const dueDates: string[] = []
  for (let i = 0; i < maxBackfill; i++) {
    const index = template.occurrenceIndex + i
    const occurrence = occurrenceAt(template.startDate, template.interval, index)
    if (occurrence > today) break
    if (template.endDate && occurrence > template.endDate) break
    dueDates.push(occurrence)
  }
  return dueDates
}

export function computeDueRecurring({
  templates,
  existingTransactions,
  existingNotifications,
  today,
  maxBackfill = DEFAULT_MAX_BACKFILL,
}: ComputeDueRecurringInput): DueRecurringResult {
  const autoRecord: AutoRecordBatch[] = []
  const remind: RemindDue[] = []

  for (const template of templates) {
    const dueDates = dueOccurrencesFor(template, today, maxBackfill)
    if (dueDates.length === 0) continue

    if (template.autoRecord) {
      // Idempotency guarantee: an occurrence is only (re-)generated if no
      // transaction already exists for this exact template+date, not based
      // on occurrenceIndex bookkeeping — so a repeated catch-up run (or one
      // interrupted mid-way through advancing state) can never double-create.
      const alreadyRecorded = new Set(
        existingTransactions.filter((t) => t.recurringId === template.id).map((t) => t.date),
      )
      const occurrences = dueDates.filter((date) => !alreadyRecorded.has(date))
      if (occurrences.length === 0) continue

      const finalOccurrenceIndex = template.occurrenceIndex + dueDates.length
      const finalNextDueDate = occurrenceAt(
        template.startDate,
        template.interval,
        finalOccurrenceIndex,
      )
      const finalLastGeneratedDate = dueDates[dueDates.length - 1] as string

      autoRecord.push({
        template,
        occurrences,
        finalOccurrenceIndex,
        finalNextDueDate,
        finalLastGeneratedDate,
      })
    } else {
      // Only the earliest outstanding occurrence produces a reminder — never
      // dump a backlog of notifications. State is deliberately NOT advanced
      // here; only confirmOccurrence() (via the repo, once the user actually
      // confirms) advances it, so a never-confirmed occurrence keeps
      // reappearing here on every catch-up run rather than silently
      // disappearing — deduped below so it won't double-notify.
      const dueDate = dueDates[0] as string
      const deepLink = `/money/recurring/confirm?id=${template.id}&due=${dueDate}`
      const scheduledFor = `${dueDate}T09:00:00.000Z`

      if (!alreadyNotified(existingNotifications, scheduledFor, deepLink)) {
        remind.push({
          template,
          dueDate,
          title: template.name,
          body:
            dueDate === today
              ? 'Due today — tap to confirm and record it.'
              : `Was due ${dueDate} — tap to confirm and record it.`,
          scheduledFor,
          deepLink,
        })
      }
    }
  }

  return { autoRecord, remind }
}
