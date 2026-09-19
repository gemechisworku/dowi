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

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task extends BaseEntity {
  title: string
  /** Tiptap JSON document, same shape as Note.contentJSON. */
  notes?: unknown
  collectionId?: string
  subtasks: Subtask[]
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
  'weekly-plan' | 'weekly-review' | 'task-due' | 'daily-agenda' | 'backup-nudge'

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
}

export interface ReminderConfig {
  weeklyPlan: { enabled: boolean; day: number; time: string }
  weeklyReview: { enabled: boolean; day: number; time: string }
  taskDue: { enabled: boolean; offsets: number[] }
  dailyAgenda: { enabled: boolean; time: string }
  backupNudge: { enabled: boolean; intervalDays: number }
  quietHours: { enabled: boolean; start: string; end: string }
}

export interface Settings {
  id: 'settings'
  baseCurrency: string
  /** 0 = Sunday .. 6 = Saturday, matching Date#getDay(). */
  weekStartsOn: number
  /** 1 = January .. 12 = December. */
  fyStartMonth: number
  theme: 'system' | 'light' | 'dark'
  textSize: 's' | 'm' | 'l'
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
