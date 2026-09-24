import Dexie, { type Table } from 'dexie'
import type {
  Account,
  AppNotification,
  Category,
  ExchangeRate,
  MetaEntry,
  Note,
  NoteCollection,
  RecurringTransaction,
  Settings,
  Source,
  Task,
  TaskCollection,
  Transaction,
} from './types'

/**
 * The one IndexedDB database for the app (PRD D2 — local-only storage).
 * Schema changes bump the version number and add a `.upgrade()` migration;
 * never edit a shipped version's `.stores()` in place.
 */
export class DowiDatabase extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  sources!: Table<Source, string>
  accounts!: Table<Account, string>
  rates!: Table<ExchangeRate, string>
  notes!: Table<Note, string>
  noteCollections!: Table<NoteCollection, string>
  tasks!: Table<Task, string>
  taskCollections!: Table<TaskCollection, string>
  notifications!: Table<AppNotification, string>
  settings!: Table<Settings, string>
  meta!: Table<MetaEntry, string>
  recurringTransactions!: Table<RecurringTransaction, string>

  constructor(name = 'dowi') {
    super(name)
    this.version(1).stores({
      transactions: '&id, date, type, categoryId, [type+date], currency, deletedAt',
      categories: '&id, type, deletedAt',
      sources: '&id, deletedAt',
      accounts: '&id, deletedAt',
      rates: '&id, currency, effectiveDate',
      notes: '&id, collectionId, updatedAt, pinned, deletedAt',
      noteCollections: '&id, deletedAt',
      tasks: '&id, collectionId, dueAt, status, weekKey, deletedAt',
      taskCollections: '&id, deletedAt',
      notifications: '&id, scheduledFor, read',
      settings: '&id',
      meta: '&key',
    })

    // Additive: a new `recurringId` index on transactions (always undefined
    // on pre-existing rows, so no `.upgrade()` migration is needed) plus the
    // new recurringTransactions table (PRD §9 recurring transactions).
    this.version(2).stores({
      transactions: '&id, date, type, categoryId, [type+date], currency, deletedAt, recurringId',
      recurringTransactions: '&id, nextDueDate, deletedAt, paused',
    })
  }
}

/**
 * A fresh instance per call rather than one shared singleton — tests each
 * get an isolated in-memory (fake-indexeddb) database by passing a unique
 * `name`; the app itself calls this once at startup with the default name.
 */
export function createDatabase(name?: string): DowiDatabase {
  return new DowiDatabase(name)
}
