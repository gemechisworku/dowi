import type { DowiDatabase } from './db'
import type {
  Account,
  AppNotification,
  Category,
  ExchangeRate,
  MetaEntry,
  Note,
  NoteCollection,
  Settings,
  Source,
  Task,
  TaskCollection,
  Transaction,
} from './types'

/** Bumped whenever the exported shape changes in a way old code couldn't read (documented in docs/DATA-FORMAT.md). */
export const BACKUP_FORMAT_VERSION = 1

export interface BackupData {
  formatVersion: number
  exportedAt: string
  transactions: Transaction[]
  categories: Category[]
  sources: Source[]
  accounts: Account[]
  rates: ExchangeRate[]
  notes: Note[]
  noteCollections: NoteCollection[]
  tasks: Task[]
  taskCollections: TaskCollection[]
  notifications: AppNotification[]
  settings?: Settings
  meta: MetaEntry[]
}

/** Exported so the Settings → Data import preview (UI layer) can compute per-table counts from a parsed-but-not-yet-imported file without a new backend function — see docs/PLAN.md's M2 note. */
export const TABLE_KEYS = [
  'transactions',
  'categories',
  'sources',
  'accounts',
  'rates',
  'notes',
  'noteCollections',
  'tasks',
  'taskCollections',
  'notifications',
  'meta',
] as const

/** Everything in the database, trash included — a restore should be exact, not just "the visible data" (TESTING §M2). */
export async function exportAll(db: DowiDatabase): Promise<BackupData> {
  const [
    transactions,
    categories,
    sources,
    accounts,
    rates,
    notes,
    noteCollections,
    tasks,
    taskCollections,
    notifications,
    settings,
    meta,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.sources.toArray(),
    db.accounts.toArray(),
    db.rates.toArray(),
    db.notes.toArray(),
    db.noteCollections.toArray(),
    db.tasks.toArray(),
    db.taskCollections.toArray(),
    db.notifications.toArray(),
    db.settings.get('settings'),
    db.meta.toArray(),
  ])

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    sources,
    accounts,
    rates,
    notes,
    noteCollections,
    tasks,
    taskCollections,
    notifications,
    settings,
    meta,
  }
}

export class BackupValidationError extends Error {}

/** Structural validation only — enough to refuse a corrupt/foreign file safely (TESTING §M2/AC-S3), not a full schema check. */
export function validateBackup(data: unknown): asserts data is BackupData {
  if (typeof data !== 'object' || data === null) {
    throw new BackupValidationError('File is not a valid Dowi backup (not a JSON object).')
  }
  const candidate = data as Record<string, unknown>

  if (typeof candidate.formatVersion !== 'number') {
    throw new BackupValidationError('File is missing a backup format version.')
  }
  if (candidate.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError(
      `This file was exported by a newer version of Dowi (format v${candidate.formatVersion}) than this app supports (v${BACKUP_FORMAT_VERSION}). Update the app first.`,
    )
  }
  for (const key of TABLE_KEYS) {
    if (!Array.isArray(candidate[key])) {
      throw new BackupValidationError(`File is missing or has a corrupt "${key}" section.`)
    }
  }
}

export type ImportMode = 'replace' | 'merge'

export interface ImportResult {
  mode: ImportMode
  counts: Record<(typeof TABLE_KEYS)[number], number>
}

/**
 * Imports a previously-exported backup. `replace` wipes every table first
 * (a full restore); `merge` adds/overwrites by id, leaving anything not in
 * the file untouched. Runs in one transaction so a failure partway through
 * never leaves the database half-imported (PRD AC-S3).
 */
export async function importAll(
  db: DowiDatabase,
  data: unknown,
  mode: ImportMode = 'replace',
): Promise<ImportResult> {
  validateBackup(data)

  const counts = {} as Record<(typeof TABLE_KEYS)[number], number>

  await db.transaction(
    'rw',
    [
      db.transactions,
      db.categories,
      db.sources,
      db.accounts,
      db.rates,
      db.notes,
      db.noteCollections,
      db.tasks,
      db.taskCollections,
      db.notifications,
      db.settings,
      db.meta,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.transactions.clear(),
          db.categories.clear(),
          db.sources.clear(),
          db.accounts.clear(),
          db.rates.clear(),
          db.notes.clear(),
          db.noteCollections.clear(),
          db.tasks.clear(),
          db.taskCollections.clear(),
          db.notifications.clear(),
          db.meta.clear(),
        ])
      }

      for (const key of TABLE_KEYS) {
        const rows = data[key] as { id?: string; key?: string }[]
        counts[key] = rows.length
      }

      await db.transactions.bulkPut(data.transactions)
      await db.categories.bulkPut(data.categories)
      await db.sources.bulkPut(data.sources)
      await db.accounts.bulkPut(data.accounts)
      await db.rates.bulkPut(data.rates)
      await db.notes.bulkPut(data.notes)
      await db.noteCollections.bulkPut(data.noteCollections)
      await db.tasks.bulkPut(data.tasks)
      await db.taskCollections.bulkPut(data.taskCollections)
      await db.notifications.bulkPut(data.notifications)
      await db.meta.bulkPut(data.meta)
      if (data.settings) await db.settings.put(data.settings)
    },
  )

  return { mode, counts }
}
