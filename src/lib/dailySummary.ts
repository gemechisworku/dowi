import type { Note, Task, Transaction } from '@/db/types'

export interface DailySummary {
  txCount: number
  /** Net of today's transactions in `currency` — cross-currency amounts are
   * excluded rather than converted (this feeds a notification blurb, not a
   * financial report; see buildReport in money/reports for the real thing). */
  netMinorUnits: number
  currency: string
  tasksDone: number
  notesAdded: number
}

/** Local "YYYY-MM-DD" prefix of an ISO datetime string. */
function localDatePrefix(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * A small, redacted recap of what happened on `today` — counts and an
 * aggregate total only, never individual transactions/notes/tasks. Used for
 * the evening-summary reminder (only sent once something's actually been
 * logged that day — see reminders.ts) and, later, as the snapshot synced
 * for server-driven push (§2 of the notification rework).
 */
export function computeDailySummary(
  transactions: Transaction[],
  tasks: Task[],
  notes: Note[],
  today: string,
  baseCurrency: string,
): DailySummary {
  const todaysTx = transactions.filter((t) => t.date === today)
  const netMinorUnits = todaysTx.reduce((sum, t) => {
    if (t.currency !== baseCurrency) return sum
    return sum + (t.type === 'expense' ? -t.amountMinorUnits : t.amountMinorUnits)
  }, 0)
  const tasksDone = tasks.filter(
    (t) => t.completedAt && localDatePrefix(t.completedAt) === today,
  ).length
  const notesAdded = notes.filter((n) => localDatePrefix(n.createdAt) === today).length

  return { txCount: todaysTx.length, netMinorUnits, currency: baseCurrency, tasksDone, notesAdded }
}
