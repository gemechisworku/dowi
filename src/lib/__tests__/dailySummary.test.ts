import { describe, expect, it } from 'vitest'
import { computeDailySummary } from '../dailySummary'
import type { Note, Task, Transaction } from '@/db/types'

const TODAY = '2026-09-21'
const YESTERDAY = '2026-09-20'

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amountMinorUnits: 1000,
    currency: 'ETB',
    date: TODAY,
    categoryId: 'cat-1',
    tags: [],
    createdAt: `${TODAY}T09:00:00.000Z`,
    updatedAt: `${TODAY}T09:00:00.000Z`,
    ...overrides,
  }
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'k1',
    title: 'Task',
    priority: 'none',
    status: 'done',
    reminderOffsets: [],
    createdAt: `${TODAY}T09:00:00.000Z`,
    updatedAt: `${TODAY}T09:00:00.000Z`,
    ...overrides,
  }
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: 'Note',
    contentJSON: {},
    contentText: '',
    tags: [],
    pinned: false,
    createdAt: `${TODAY}T09:00:00.000Z`,
    updatedAt: `${TODAY}T09:00:00.000Z`,
    ...overrides,
  }
}

describe('computeDailySummary', () => {
  it('counts only today’s transactions/tasks/notes, excluding other days', () => {
    const transactions = [tx({ id: 'a' }), tx({ id: 'b', date: YESTERDAY })]
    const tasks = [
      task({ id: 'x', completedAt: `${TODAY}T10:00:00.000Z` }),
      task({ id: 'y', completedAt: `${YESTERDAY}T10:00:00.000Z` }),
      task({ id: 'z', status: 'todo', completedAt: undefined }),
    ]
    const notes = [note({ id: 'p' }), note({ id: 'q', createdAt: `${YESTERDAY}T09:00:00.000Z` })]

    const summary = computeDailySummary(transactions, tasks, notes, TODAY, 'ETB')

    expect(summary.txCount).toBe(1)
    expect(summary.tasksDone).toBe(1)
    expect(summary.notesAdded).toBe(1)
  })

  it('nets income and expense in the base currency, ignoring other currencies', () => {
    const transactions = [
      tx({ id: 'a', type: 'income', amountMinorUnits: 5000 }),
      tx({ id: 'b', type: 'expense', amountMinorUnits: 2000 }),
      tx({ id: 'c', type: 'income', amountMinorUnits: 9999, currency: 'USD' }),
    ]

    const summary = computeDailySummary(transactions, [], [], TODAY, 'ETB')

    expect(summary.txCount).toBe(3)
    expect(summary.netMinorUnits).toBe(3000)
    expect(summary.currency).toBe('ETB')
  })

  it('is all zeros for a day with no activity', () => {
    const summary = computeDailySummary([], [], [], TODAY, 'ETB')
    expect(summary).toEqual({
      txCount: 0,
      netMinorUnits: 0,
      currency: 'ETB',
      tasksDone: 0,
      notesAdded: 0,
    })
  })
})
