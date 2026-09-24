import type { DowiDatabase } from './db'
import { createSoftDeleteRepo, type SoftDeleteRepo } from './softDeleteRepo'
import { occurrenceAt } from '@/lib/recurrence'
import type { RecurringTransaction } from './types'

type StoredCreateInput = Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

/** What a caller supplies to create a template — occurrenceIndex/nextDueDate are derived, not chosen. */
export type RecurringCreateInput = Omit<
  StoredCreateInput,
  'occurrenceIndex' | 'nextDueDate' | 'lastGeneratedDate'
>

export interface RecurringRepo extends SoftDeleteRepo<RecurringTransaction, StoredCreateInput> {
  create(input: RecurringCreateInput): Promise<RecurringTransaction>
  /** Advances the template by exactly one occurrence, keyed off the *scheduled* due date — called only from the confirm flow, after the real Transaction has been created. */
  confirmOccurrence(id: string, dueDate: string): Promise<void>
}

/** Wraps the generic soft-delete repo with recurring-transaction-specific create defaults and occurrence advancement. */
export function createRecurringRepo(db: DowiDatabase): RecurringRepo {
  const base = createSoftDeleteRepo<RecurringTransaction, StoredCreateInput>(
    db.recurringTransactions,
  )

  return {
    ...base,

    async create(input: RecurringCreateInput) {
      return base.create({ ...input, occurrenceIndex: 0, nextDueDate: input.startDate })
    },

    async confirmOccurrence(id: string, dueDate: string) {
      const template = await base.get(id)
      if (!template) return
      const nextIndex = template.occurrenceIndex + 1
      await base.update(id, {
        occurrenceIndex: nextIndex,
        nextDueDate: occurrenceAt(template.startDate, template.interval, nextIndex),
        lastGeneratedDate: dueDate,
      })
    },
  }
}
