import { describe, expect, it } from 'vitest'
import { computeImportPreview, totalImportRows } from '../importPreview'
import { BACKUP_FORMAT_VERSION, type BackupData } from '@/db/backup'
import type { Category, Transaction, Task } from '@/db/types'

function emptyBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: '2026-01-01T00:00:00.000Z',
    transactions: [],
    categories: [],
    sources: [],
    accounts: [],
    rates: [],
    notes: [],
    noteCollections: [],
    tasks: [],
    taskCollections: [],
    notifications: [],
    meta: [],
    ...overrides,
  }
}

function makeTransaction(id: string): Transaction {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id,
    createdAt: now,
    updatedAt: now,
    type: 'expense',
    amountMinorUnits: 100,
    currency: 'ETB',
    date: '2026-01-01',
    categoryId: 'cat-1',
    tags: [],
  }
}

function makeCategory(id: string): Category {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id,
    createdAt: now,
    updatedAt: now,
    name: 'Food',
    icon: '🍔',
    color: '#000',
    type: 'expense',
  }
}

function makeTask(id: string): Task {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id,
    createdAt: now,
    updatedAt: now,
    title: 'Task',
    priority: 'none',
    status: 'todo',
    reminderOffsets: [],
  }
}

describe('computeImportPreview', () => {
  it('counts every table by its array length, all-zero for an empty backup', () => {
    const rows = computeImportPreview(emptyBackup())
    expect(rows).toHaveLength(11)
    expect(rows.every((r) => r.count === 0)).toBe(true)
    expect(rows.find((r) => r.key === 'transactions')?.label).toBe('Transactions')
  })

  it('reflects each table independently', () => {
    const data = emptyBackup({
      transactions: [makeTransaction('t1'), makeTransaction('t2'), makeTransaction('t3')],
      categories: [makeCategory('c1')],
    })
    const rows = computeImportPreview(data)
    expect(rows.find((r) => r.key === 'transactions')?.count).toBe(3)
    expect(rows.find((r) => r.key === 'categories')?.count).toBe(1)
    expect(rows.find((r) => r.key === 'notes')?.count).toBe(0)
  })

  it('totalImportRows sums across every table', () => {
    const data = emptyBackup({
      transactions: [makeTransaction('t1'), makeTransaction('t2')],
      tasks: [makeTask('k1')],
    })
    expect(totalImportRows(computeImportPreview(data))).toBe(3)
  })
})
