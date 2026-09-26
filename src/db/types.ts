/**
 * Entity types for the local database (Dexie/IndexedDB). Field shapes
 * follow PRD §5 data models. Every soft-deletable entity carries
 * createdAt/updatedAt/deletedAt (ISO 8601 strings) so repositories can
 * implement undo/trash uniformly (PLAN.md §M2).
 */

export type TransactionType = 'income' | 'expense'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Transaction extends BaseEntity {
  type: TransactionType
  /** Integer minor units, e.g. 12345 = 123.45 in a 2-decimal currency. */
  amountMinorUnits: number
  currency: string
  /** Local calendar date, "YYYY-MM-DD". */
  date: string
  categoryId: string
  sourceId?: string
  accountId?: string
  note?: string
  tags: string[]
  /** Set only when this was generated from a RecurringTransaction template — also the idempotency key that stops the catch-up scheduler from double-generating an occurrence. */
  recurringId?: string
}

export type RecurrenceUnit = 'week' | 'month' | 'year'

export interface RecurrenceInterval {
  unit: RecurrenceUnit
  /** How many units between occurrences, e.g. {unit:'week', every:2} = bi-weekly. Always >= 1. */
  every: number
}

/**
 * A recurring income/expense template (rent, subscriptions, ...). Each
 * occurrence is computed on demand from `startDate` + `interval` +
 * `occurrenceIndex` (see `occurrenceAt` in `src/lib/recurrence.ts`) rather
 * than stored per-occurrence — editing the template only ever affects
 * future occurrences, since nothing about a past, already-recorded
 * Transaction refers back to this beyond its own `recurringId`.
 */
export interface RecurringTransaction extends BaseEntity {
  /** Distinct from the category — lets multiple recurring items share one category (e.g. "Netflix" and "Spotify" both under Subscriptions). */
  name: string
  type: TransactionType
  amountMinorUnits: number
  currency: string
  categoryId: string
  sourceId?: string
  accountId?: string
  note?: string
  tags: string[]
  interval: RecurrenceInterval
  /** Local calendar date, "YYYY-MM-DD" — the fixed anchor every occurrence is computed from. */
  startDate: string
  /** Inclusive, "YYYY-MM-DD" — omitted means the recurrence runs indefinitely. */
  endDate?: string
  /** true = silently create the transaction on the due date; false = notify and let the user confirm/edit first. */
  autoRecord: boolean
  /** How many occurrences have been generated/confirmed so far — the index fed into occurrenceAt() to find the next due date. */
  occurrenceIndex: number
  /** = occurrenceAt(startDate, interval, occurrenceIndex), cached so Dexie can sort/index on it cheaply without recomputing per row. */
  nextDueDate: string
  /** The due date of the most recently generated/confirmed occurrence, if any. */
  lastGeneratedDate?: string
  /** Pauses generation/reminders without deleting the template. */
  paused: boolean
}

export interface Category extends BaseEntity {
  name: string
  icon: string
  color: string
  type: TransactionType
}

export interface Source extends BaseEntity {
  name: string
}

export interface Account extends BaseEntity {
  name: string
}

export interface ExchangeRate extends BaseEntity {
  /** ISO 4217 code being converted *from*. */
  currency: string
  /** 1 <currency> = rateToBase <base currency at the time it was set>. */
  rateToBase: number
  /** The date this rate was set/observed, "YYYY-MM-DD". */
  effectiveDate: string
}

export interface NoteCollection extends BaseEntity {
  name: string
  color: string
  icon?: string
}

export interface Note extends BaseEntity {
  title: string
  /** Tiptap JSON document. Opaque here — M5 owns its shape. */
  contentJSON: unknown
  /** Plain-text derived from contentJSON, kept in sync, used for search. */
  contentText: string
  collectionId?: string
  tags: string[]
  pinned: boolean
  color?: string
}

export interface TaskCollection extends BaseEntity {
  name: string
  color: string
  icon?: string
}

export type TaskPriority = 'none' | 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task extends BaseEntity {
  title: string
  /** Tiptap JSON document, same shape as Note.contentJSON. */
  notes?: unknown
  collectionId?: string
  /**
   * Set on a subtask — a full Task in its own right (same notes/due
   * date/priority/reminders any task can have), just nested under another
   * one instead of appearing as its own top-level entry (taskViews.ts's
   * Today/Upcoming/All/Completed views all exclude it). Was a lightweight
   * embedded `{id, title, done}[]` array before M13; migrated to standalone
   * rows in db.ts's version 3 upgrade so subtasks get every field a task has
   * instead of duplicating a reduced shape.
   */
  parentTaskId?: string
  /** ISO 8601 datetime. */
  dueAt?: string
  priority: TaskPriority
  status: TaskStatus
  completedAt?: string
  /** ISO week key "YYYY-Www", set when the task is placed in a weekly plan. */
  weekKey?: string
  /** Minutes before dueAt that a reminder should fire. */
  reminderOffsets: number[]
}

export type NotificationType =
  | 'weekly-plan'
  | 'weekly-review'
  | 'task-due'
  | 'daily-agenda'
  | 'backup-nudge'
  | 'morning-nudge'
  | 'evening-streak'
  | 'evening-summary'
  | 'recurring-due'

/**
 * Extra, type-specific detail rendered on the notification detail page
 * (`/notifications/:id`) beyond `title`/`body` — every field optional since
 * which ones apply depends on `AppNotification.type`. A flat bag rather
 * than a discriminated union: nothing here is a correctness-sensitive
 * invariant, just extra display detail, so the plumbing stays simple.
 */
export interface NotificationDetailData {
  /** morning-nudge, evening-streak: the streak count as of when this fired. */
  currentStreak?: number
  /** evening-summary: today's activity recap. */
  txCount?: number
  netMinorUnits?: number
  currency?: string
  tasksDone?: number
  notesAdded?: number
  /** task-due: which task this reminder is about. */
  taskId?: string
  /** recurring-due: which RecurringTransaction template this reminder is about. */
  recurringId?: string
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  /** ISO 8601 datetime this was/is scheduled to fire. */
  scheduledFor: string
  /** Set once actually shown via the Notification API (or suppressed by quiet hours). */
  deliveredAt?: string
  read: boolean
  /** In-app route to open when tapped, e.g. "/tasks/abc123". */
  deepLink?: string
  createdAt: string
  data?: NotificationDetailData
  /**
   * Set when the user clears it from the inbox — hidden from view, but kept
   * around (not hard-deleted) so this occurrence still counts as "already
   * raised" and doesn't get recreated as a fresh, unread notification the
   * next time reminders are recomputed. See notificationsRepo.ts.
   */
  clearedAt?: string
}

export interface ReminderConfig {
  weeklyPlan: { enabled: boolean; day: number; time: string }
  weeklyReview: { enabled: boolean; day: number; time: string }
  taskDue: { enabled: boolean; offsets: number[] }
  dailyAgenda: { enabled: boolean; time: string }
  backupNudge: { enabled: boolean; intervalDays: number }
  /** Encourages the day's first check-in. */
  morningNudge: { enabled: boolean; time: string }
  /** Only actually fires if no qualifying action (an income/expense, note or task added) has happened yet that day — see computeDueReminders. */
  eveningStreak: { enabled: boolean; time: string }
  quietHours: { enabled: boolean; start: string; end: string }
}

export interface Settings {
  id: 'settings'
  /** Optional, for personalizing greetings and reminder copy — never required. */
  displayName?: string
  baseCurrency: string
  /** 0 = Sunday .. 6 = Saturday, matching Date#getDay(). */
  weekStartsOn: number
  /** 1 = January .. 12 = December. */
  fyStartMonth: number
  theme: 'system' | 'light' | 'dark'
  textSize: 's' | 'm' | 'l'
  density: 'comfortable' | 'compact'
  hideAmounts: boolean
  defaultAccountId?: string
  reminders: ReminderConfig
  lastBackupAt?: string
}

/** Simple key-value store for app/schema bookkeeping (not user-facing settings). */
export interface MetaEntry {
  key: string
  value: string
}
