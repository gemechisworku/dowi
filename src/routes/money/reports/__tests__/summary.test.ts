import { describe, expect, it } from 'vitest'
import { buildShareSummary } from '../summary'
import type { ReportData } from '../aggregate'
import type { Category } from '@/db/types'

function convertedSum(totalMinorUnits: number) {
  return { totalMinorUnits, wasConverted: false, excluded: {} }
}

function report(overrides: Partial<ReportData> = {}): ReportData {
  return {
    period: 'month',
    range: { start: '2026-09-01', end: '2026-09-30' },
    transactions: [],
    income: convertedSum(500000),
    expense: convertedSum(300000),
    netMinorUnits: 200000,
    netDeltaPct: null,
    subPeriods: [],
    categoryBreakdown: { income: [], expense: [] },
    sourceBreakdown: [],
    accountBreakdown: [],
    excludedCurrencies: {},
    recurringBreakdown: [],
    ...overrides,
  }
}

function category(id: string, name: string): Category {
  return { id, name, icon: '🍽️', color: '#000', type: 'expense', createdAt: '', updatedAt: '' }
}

describe('buildShareSummary', () => {
  it('includes the period label and headline totals', () => {
    const summary = buildShareSummary(report(), 'September 2026', 'ETB', new Map())
    expect(summary).toContain('Dowi — September 2026')
    expect(summary).toContain('Income: ETB 5,000.00')
    expect(summary).toContain('Expense: ETB 3,000.00')
    expect(summary).toContain('Net: ETB 2,000.00')
  })

  it('shows a negative net with a minus sign', () => {
    const summary = buildShareSummary(
      report({
        income: convertedSum(100000),
        expense: convertedSum(300000),
        netMinorUnits: -200000,
      }),
      'September 2026',
      'ETB',
      new Map(),
    )
    expect(summary).toContain('Net: -ETB 2,000.00')
  })

  it('lists up to the top 3 expense categories by resolved name', () => {
    const categoryById = new Map([
      ['food', category('food', 'Food')],
      ['transport', category('transport', 'Transport')],
    ])
    const summary = buildShareSummary(
      report({
        categoryBreakdown: {
          income: [],
          expense: [
            { key: 'food', amountMinorUnits: 200000, count: 4 },
            { key: 'transport', amountMinorUnits: 100000, count: 2 },
          ],
        },
      }),
      'September 2026',
      'ETB',
      categoryById,
    )
    expect(summary).toContain('Top expenses:')
    expect(summary).toContain('- Food: ETB 2,000.00')
    expect(summary).toContain('- Transport: ETB 1,000.00')
  })

  it('falls back to "Uncategorised" for an empty category key', () => {
    const summary = buildShareSummary(
      report({
        categoryBreakdown: {
          income: [],
          expense: [{ key: '', amountMinorUnits: 50000, count: 1 }],
        },
      }),
      'September 2026',
      'ETB',
      new Map(),
    )
    expect(summary).toContain('- Uncategorised: ETB 500.00')
  })

  it('omits the "Top expenses" section entirely when there are no expenses', () => {
    const summary = buildShareSummary(report(), 'September 2026', 'ETB', new Map())
    expect(summary).not.toContain('Top expenses')
  })

  it('caps the list at 3 even when more categories are present', () => {
    const categoryById = new Map(
      ['a', 'b', 'c', 'd'].map((id) => [id, category(id, id.toUpperCase())]),
    )
    const summary = buildShareSummary(
      report({
        categoryBreakdown: {
          income: [],
          expense: ['a', 'b', 'c', 'd'].map((key, i) => ({
            key,
            amountMinorUnits: 1000 * (4 - i),
            count: 1,
          })),
        },
      }),
      'September 2026',
      'ETB',
      categoryById,
    )
    expect(summary).toContain('- A:')
    expect(summary).toContain('- B:')
    expect(summary).toContain('- C:')
    expect(summary).not.toContain('- D:')
  })
})
