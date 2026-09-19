import { describe, expect, it } from 'vitest'
import { groupByMonthAndDay } from '../groupTransactions'
import type { Transaction } from '@/db/types'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'expense',
    amountMinorUnits: 1000,
    currency: 'ETB',
    date: '2026-09-01',
    categoryId: 'cat-1',
    tags: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('groupByMonthAndDay', () => {
  it('groups transactions by day within a month', () => {
    const groups = groupByMonthAndDay([
      tx({ date: '2026-09-01' }),
      tx({ date: '2026-09-01' }),
      tx({ date: '2026-09-15' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.days).toHaveLength(2)
    expect(groups[0]?.days.find((d) => d.date === '2026-09-01')?.transactions).toHaveLength(2)
  })

  it('sorts months newest-first and days within a month newest-first', () => {
    const groups = groupByMonthAndDay([
      tx({ date: '2026-08-05' }),
      tx({ date: '2026-09-20' }),
      tx({ date: '2026-09-01' }),
    ])
    expect(groups.map((g) => g.monthKey)).toEqual(['2026-09', '2026-08'])
    expect(groups[0]?.days.map((d) => d.date)).toEqual(['2026-09-20', '2026-09-01'])
  })

  it('computes a per-currency net subtotal (income positive, expense negative)', () => {
    const groups = groupByMonthAndDay([
      tx({ date: '2026-09-01', type: 'income', amountMinorUnits: 50000, currency: 'ETB' }),
      tx({ date: '2026-09-01', type: 'expense', amountMinorUnits: 20000, currency: 'ETB' }),
      tx({ date: '2026-09-01', type: 'expense', amountMinorUnits: 1000, currency: 'USD' }),
    ])
    const day = groups[0]?.days[0]
    expect(day?.subtotals).toEqual({ ETB: 30000, USD: -1000 })
  })

  it('produces a human month label', () => {
    const groups = groupByMonthAndDay([tx({ date: '2026-09-01' })])
    expect(groups[0]?.label).toBe('September 2026')
  })

  it('returns an empty array for no transactions', () => {
    expect(groupByMonthAndDay([])).toEqual([])
  })
})
