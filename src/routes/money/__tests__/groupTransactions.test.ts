import { describe, expect, it } from 'vitest'
import { groupByMonthAndDay, groupRecurring } from '../groupTransactions'
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

  it('excludes recurring-generated transactions from the day subtotal, but still lists them', () => {
    const groups = groupByMonthAndDay([
      tx({ date: '2026-09-01', type: 'expense', amountMinorUnits: 20000, currency: 'ETB' }),
      tx({
        date: '2026-09-01',
        type: 'expense',
        amountMinorUnits: 99999,
        currency: 'ETB',
        recurringId: 'rent',
      }),
    ])
    const day = groups[0]?.days[0]
    expect(day?.subtotals).toEqual({ ETB: -20000 })
    expect(day?.transactions).toHaveLength(2) // still listed, just excluded from the subtotal
  })

  it('produces a human month label', () => {
    const groups = groupByMonthAndDay([tx({ date: '2026-09-01' })])
    expect(groups[0]?.label).toBe('September 2026')
  })

  it('returns an empty array for no transactions', () => {
    expect(groupByMonthAndDay([])).toEqual([])
  })
})

describe('groupRecurring', () => {
  it('ignores ordinary transactions with no recurringId', () => {
    expect(groupRecurring([tx({ date: '2026-09-01' })])).toEqual([])
  })

  it('sums every occurrence of the same recurring item into one group', () => {
    const groups = groupRecurring([
      tx({ date: '2026-09-01', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
      tx({ date: '2026-09-08', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
      tx({ date: '2026-09-15', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      recurringId: 'weekly-rent',
      type: 'expense',
      subtotals: { ETB: 3000 },
    })
    expect(groups[0]?.transactions).toHaveLength(3)
  })

  it('keeps different recurring items in separate groups', () => {
    const groups = groupRecurring([
      tx({ recurringId: 'rent', amountMinorUnits: 50000, type: 'expense' }),
      tx({ recurringId: 'salary', amountMinorUnits: 800000, type: 'income' }),
    ])
    const byId = new Map(groups.map((g) => [g.recurringId, g]))
    expect(byId.get('rent')?.subtotals).toEqual({ ETB: 50000 })
    expect(byId.get('salary')?.subtotals).toEqual({ ETB: 800000 })
  })

  it('sums per currency separately within one recurring item', () => {
    const groups = groupRecurring([
      tx({ recurringId: 'rent', amountMinorUnits: 50000, currency: 'ETB' }),
      tx({ recurringId: 'rent', amountMinorUnits: 100, currency: 'USD' }),
    ])
    expect(groups[0]?.subtotals).toEqual({ ETB: 50000, USD: 100 })
  })
})
