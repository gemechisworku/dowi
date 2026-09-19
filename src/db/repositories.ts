import type { DowiDatabase } from './db'
import { createSoftDeleteRepo } from './softDeleteRepo'
import type {
  Account,
  Category,
  ExchangeRate,
  Note,
  NoteCollection,
  Source,
  Task,
  TaskCollection,
  Transaction,
  TransactionType,
} from './types'

type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

export interface TransactionFilters {
  type?: TransactionType
  categoryId?: string
  sourceId?: string
  accountId?: string
  currency?: string
  /** Inclusive "YYYY-MM-DD" bounds. */
  fromDate?: string
  toDate?: string
  /** Case-insensitive substring match against the note field. */
  text?: string
}

/** Builds every entity repository against one database instance — called once per app/test lifetime. */
export function createRepositories(db: DowiDatabase) {
  const categories = createSoftDeleteRepo<Category, CreateInput<Category>>(db.categories)
  const sources = createSoftDeleteRepo<Source, CreateInput<Source>>(db.sources)
  const accounts = createSoftDeleteRepo<Account, CreateInput<Account>>(db.accounts)
  const noteCollections = createSoftDeleteRepo<NoteCollection, CreateInput<NoteCollection>>(
    db.noteCollections,
  )
  const notes = createSoftDeleteRepo<Note, CreateInput<Note>>(db.notes)
  const taskCollections = createSoftDeleteRepo<TaskCollection, CreateInput<TaskCollection>>(
    db.taskCollections,
  )
  const tasks = createSoftDeleteRepo<Task, CreateInput<Task>>(db.tasks)
  const baseTransactions = createSoftDeleteRepo<Transaction, CreateInput<Transaction>>(
    db.transactions,
  )
  const rates = createSoftDeleteRepo<ExchangeRate, CreateInput<ExchangeRate>>(db.rates)

  const transactions = {
    ...baseTransactions,

    /** list() with optional filters, still excluding soft-deleted rows. */
    async listFiltered(filters: TransactionFilters = {}): Promise<Transaction[]> {
      const all = await baseTransactions.list()
      return all.filter((tx) => {
        if (filters.type && tx.type !== filters.type) return false
        if (filters.categoryId && tx.categoryId !== filters.categoryId) return false
        if (filters.sourceId && tx.sourceId !== filters.sourceId) return false
        if (filters.accountId && tx.accountId !== filters.accountId) return false
        if (filters.currency && tx.currency !== filters.currency) return false
        if (filters.fromDate && tx.date < filters.fromDate) return false
        if (filters.toDate && tx.date > filters.toDate) return false
        if (filters.text && !(tx.note ?? '').toLowerCase().includes(filters.text.toLowerCase())) {
          return false
        }
        return true
      })
    },

    /** Reassigns every transaction referencing categoryId to replacementId (used when deleting a category — PRD AC-M5/D2). */
    async reassignCategory(categoryId: string, replacementId: string): Promise<number> {
      const affected = await db.transactions.where({ categoryId }).toArray()
      await db.transactions.bulkPut(
        affected.map((tx) => ({
          ...tx,
          categoryId: replacementId,
          updatedAt: new Date().toISOString(),
        })),
      )
      return affected.length
    },
  }

  /** Latest rate for a currency, optionally as of a given date (defaults to "most recent ever set"). */
  async function getRateForCurrency(
    currency: string,
    asOfDate?: string,
  ): Promise<ExchangeRate | undefined> {
    const all = await rates.list()
    const candidates = all
      .filter((r) => r.currency === currency)
      .filter((r) => !asOfDate || r.effectiveDate <= asOfDate)
      .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))
    return candidates[0]
  }

  return {
    categories,
    sources,
    accounts,
    noteCollections,
    notes,
    taskCollections,
    tasks,
    transactions,
    rates: { ...rates, getRateForCurrency },
  }
}

export type Repositories = ReturnType<typeof createRepositories>
