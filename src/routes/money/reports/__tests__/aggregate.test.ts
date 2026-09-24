import { describe, expect, it } from 'vitest'
import { buildReport, buildCategoryTrend, isFuturePeriod, type ReportOptions } from '../aggregate'
import { MAX_CATEGORY_SLICES } from '../chartColors'
import type { Transaction } from '@/db/types'

let counter = 0
function tx(overrides: Partial<Transaction>): Transaction {
  counter += 1
  return {
    id: `tx-${counter}`,
    type: 'expense',
    amountMinorUnits: 1000,
    currency: 'ETB',
    date: '2026-09-15',
    categoryId: 'food',
    tags: [],
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides,
  }
}

const baseOpts: ReportOptions = {
  weekStartsOn: 1,
  fyStartMonth: 1,
  baseCurrency: 'ETB',
  getRate: () => undefined,
}

describe('buildReport — headline totals', () => {
  it('sums income and expense correctly for a month, with net = income - expense', () => {
    const transactions = [
      tx({ type: 'income', amountMinorUnits: 500000, date: '2026-09-01', categoryId: 'salary' }),
      tx({ type: 'income', amountMinorUnits: 200000, date: '2026-09-20', categoryId: 'freelance' }),
      tx({ type: 'expense', amountMinorUnits: 300000, date: '2026-09-10', categoryId: 'food' }),
      tx({ type: 'expense', amountMinorUnits: 50000, date: '2026-09-25', categoryId: 'transport' }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.income.totalMinorUnits).toBe(700000)
    expect(report.expense.totalMinorUnits).toBe(350000)
    expect(report.netMinorUnits).toBe(350000)
  })

  it('excludes transactions outside the period', () => {
    const transactions = [
      tx({ date: '2026-09-15', amountMinorUnits: 1000 }),
      tx({ date: '2026-08-15', amountMinorUnits: 99999 }), // previous month, must not count
      tx({ date: '2026-10-15', amountMinorUnits: 99999 }), // next month, must not count
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.expense.totalMinorUnits).toBe(1000)
  })

  it('day/week/month/FY totals match a hand calculation for a mixed fixture', () => {
    const transactions = [
      tx({ type: 'income', date: '2026-09-15', amountMinorUnits: 100000 }), // in day, week, month, FY
      tx({ type: 'expense', date: '2026-09-15', amountMinorUnits: 20000 }),
      tx({ type: 'expense', date: '2026-09-14', amountMinorUnits: 5000 }), // in week, month, FY only
      tx({ type: 'expense', date: '2026-09-01', amountMinorUnits: 7000 }), // in month, FY only
      tx({ type: 'expense', date: '2026-03-01', amountMinorUnits: 3000 }), // in FY only
    ]
    const day = buildReport(transactions, 'day', '2026-09-15', baseOpts)
    expect(day.income.totalMinorUnits).toBe(100000)
    expect(day.expense.totalMinorUnits).toBe(20000)

    const week = buildReport(transactions, 'week', '2026-09-15', baseOpts) // Mon 2026-09-14 .. Sun 2026-09-20
    expect(week.expense.totalMinorUnits).toBe(25000)

    const month = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(month.expense.totalMinorUnits).toBe(32000)

    const year = buildReport(transactions, 'year', '2026-09-15', baseOpts)
    expect(year.expense.totalMinorUnits).toBe(35000)
  })
})

describe('buildReport — category/source/account breakdowns sum to the headline total', () => {
  it('category breakdown sums to the expense total, to the minor unit', () => {
    const transactions = [
      tx({ type: 'expense', categoryId: 'food', amountMinorUnits: 12345 }),
      tx({ type: 'expense', categoryId: 'food', amountMinorUnits: 100 }),
      tx({ type: 'expense', categoryId: 'transport', amountMinorUnits: 6789 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    const sum = report.categoryBreakdown.expense.reduce((s, e) => s + e.amountMinorUnits, 0)
    expect(sum).toBe(report.expense.totalMinorUnits)
  })

  it('income category breakdown sums to the income total', () => {
    const transactions = [
      tx({ type: 'income', categoryId: 'salary', amountMinorUnits: 500000 }),
      tx({ type: 'income', categoryId: 'freelance', amountMinorUnits: 150000 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    const sum = report.categoryBreakdown.income.reduce((s, e) => s + e.amountMinorUnits, 0)
    expect(sum).toBe(report.income.totalMinorUnits)
  })

  it('source breakdown only includes income transactions with a sourceId, and sums correctly', () => {
    const transactions = [
      tx({ type: 'income', sourceId: 'client-a', amountMinorUnits: 100000 }),
      tx({ type: 'income', sourceId: 'client-a', amountMinorUnits: 50000 }),
      tx({ type: 'income', amountMinorUnits: 20000 }), // no source, excluded from breakdown
      tx({ type: 'expense', sourceId: 'client-a', amountMinorUnits: 999 }), // expense, never a "source"
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.sourceBreakdown).toEqual([
      { key: 'client-a', amountMinorUnits: 150000, count: 2 },
    ])
  })

  it('account breakdown includes both income and expense transactions with an accountId', () => {
    const transactions = [
      tx({ type: 'income', accountId: 'bank', amountMinorUnits: 100000 }),
      tx({ type: 'expense', accountId: 'bank', amountMinorUnits: 30000 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.accountBreakdown).toEqual([{ key: 'bank', amountMinorUnits: 70000, count: 2 }])
  })

  it('sorts breakdown entries by amount descending', () => {
    const transactions = [
      tx({ type: 'expense', categoryId: 'small', amountMinorUnits: 100 }),
      tx({ type: 'expense', categoryId: 'big', amountMinorUnits: 9000 }),
      tx({ type: 'expense', categoryId: 'medium', amountMinorUnits: 500 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.categoryBreakdown.expense.map((e) => e.key)).toEqual(['big', 'medium', 'small'])
  })
})

describe('buildReport — previous-period delta', () => {
  it('computes a positive percentage when net grew', () => {
    const transactions = [
      tx({ type: 'income', date: '2026-09-10', amountMinorUnits: 20000 }), // this month net +20000
      tx({ type: 'income', date: '2026-08-10', amountMinorUnits: 10000 }), // last month net +10000
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.netDeltaPct).toBe(100) // doubled
  })

  it('is null (shown as "—") when the previous period had exactly zero net, not Infinity/NaN', () => {
    const transactions = [tx({ type: 'income', date: '2026-09-10', amountMinorUnits: 20000 })]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.netDeltaPct).toBeNull()
  })

  it('handles a negative previous net correctly (percentage relative to magnitude)', () => {
    const transactions = [
      tx({ type: 'income', date: '2026-09-10', amountMinorUnits: 10000 }), // this month net +10000
      tx({ type: 'expense', date: '2026-08-10', amountMinorUnits: 10000 }), // last month net -10000
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    // from -10000 to +10000 is a change of +20000, relative to abs(-10000) = 200%
    expect(report.netDeltaPct).toBe(200)
  })
})

describe('buildReport — week-start configuration', () => {
  it('shifts which days belong to "this week" when weekStartsOn changes', () => {
    const transactions = [
      tx({ date: '2026-09-13', amountMinorUnits: 1000 }), // Sunday
      tx({ date: '2026-09-14', amountMinorUnits: 2000 }), // Monday
    ]
    const mondayStart = buildReport(transactions, 'week', '2026-09-16', {
      ...baseOpts,
      weekStartsOn: 1,
    })
    // Monday-start week of 2026-09-16 (Wed) is Mon 09-14 .. Sun 09-20 — excludes Sun 09-13.
    expect(mondayStart.expense.totalMinorUnits).toBe(2000)

    const sundayStart = buildReport(transactions, 'week', '2026-09-16', {
      ...baseOpts,
      weekStartsOn: 0,
    })
    // Sunday-start week of 2026-09-16 is Sun 09-13 .. Sat 09-19 — includes both.
    expect(sundayStart.expense.totalMinorUnits).toBe(3000)
  })
})

describe('buildReport — financial year configuration', () => {
  it('places a 15 June and a 15 July transaction in different FYs when the FY starts in July', () => {
    const transactions = [
      tx({ date: '2026-06-15', amountMinorUnits: 1000 }),
      tx({ date: '2026-07-15', amountMinorUnits: 2000 }),
    ]
    const opts = { ...baseOpts, fyStartMonth: 7 }
    const juneFY = buildReport(transactions, 'year', '2026-06-15', opts)
    const julyFY = buildReport(transactions, 'year', '2026-07-15', opts)
    expect(juneFY.expense.totalMinorUnits).toBe(1000)
    expect(julyFY.expense.totalMinorUnits).toBe(2000)
  })
})

describe('buildReport — mixed currency', () => {
  it('converts a foreign-currency transaction using the supplied rate', () => {
    const transactions = [
      tx({ type: 'expense', currency: 'ETB', amountMinorUnits: 10000 }),
      tx({ type: 'expense', currency: 'USD', amountMinorUnits: 1200 }), // 12.00 USD
    ]
    const opts: ReportOptions = { ...baseOpts, getRate: (c) => (c === 'USD' ? 140 : undefined) }
    const report = buildReport(transactions, 'month', '2026-09-15', opts)
    // 12.00 USD * 140 = 1680.00 ETB = 168000 minor units
    expect(report.expense.totalMinorUnits).toBe(10000 + 168000)
    expect(report.expense.wasConverted).toBe(true)
    expect(report.excludedCurrencies).toEqual({})
  })

  it('excludes and reports a currency with no rate, rather than silently dropping it', () => {
    const transactions = [
      tx({ type: 'expense', currency: 'ETB', amountMinorUnits: 10000 }),
      tx({ type: 'expense', currency: 'USD', amountMinorUnits: 1200 }),
      tx({ type: 'expense', currency: 'USD', amountMinorUnits: 500 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts) // no rates configured
    expect(report.expense.totalMinorUnits).toBe(10000) // USD entries excluded
    expect(report.excludedCurrencies).toEqual({ USD: 2 })
  })

  it('excludes an unconvertible transaction from every breakdown too', () => {
    const transactions = [
      tx({ type: 'expense', currency: 'USD', categoryId: 'food', amountMinorUnits: 1200 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.categoryBreakdown.expense).toEqual([])
  })
})

describe('buildReport — recurring transactions', () => {
  it('excludes recurring-generated transactions from the headline income/expense totals', () => {
    const transactions = [
      tx({ type: 'expense', amountMinorUnits: 10000 }), // ordinary
      tx({ type: 'expense', amountMinorUnits: 99999, recurringId: 'rent' }), // recurring — must not count
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.expense.totalMinorUnits).toBe(10000)
    expect(report.netMinorUnits).toBe(-10000)
  })

  it('excludes recurring-generated transactions from sub-period buckets, category/source/account breakdowns, and excludedCurrencies', () => {
    const transactions = [
      tx({
        type: 'expense',
        date: '2026-09-10',
        categoryId: 'food',
        sourceId: undefined,
        accountId: 'bank',
        currency: 'USD', // unconvertible with baseOpts — would otherwise show up in excludedCurrencies
        amountMinorUnits: 5000,
        recurringId: 'rent',
      }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.subPeriods.every((b) => b.expenseMinorUnits === 0)).toBe(true)
    expect(report.categoryBreakdown.expense).toEqual([])
    expect(report.accountBreakdown).toEqual([])
    expect(report.excludedCurrencies).toEqual({})
  })

  it('still includes recurring-generated transactions in the raw `transactions` list (for CSV/view-transactions)', () => {
    const transactions = [tx({ type: 'expense', amountMinorUnits: 5000, recurringId: 'rent' })]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.transactions).toHaveLength(1)
  })

  it('excludes recurring transactions from the previous-period comparison too', () => {
    const transactions = [
      tx({ type: 'income', date: '2026-09-10', amountMinorUnits: 20000 }), // this month, net +20000
      tx({ type: 'income', date: '2026-08-10', amountMinorUnits: 10000 }), // last month, net +10000
      tx({
        type: 'income',
        date: '2026-08-10',
        amountMinorUnits: 999999,
        recurringId: 'salary',
      }), // recurring, must not inflate last month's net
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.netDeltaPct).toBe(100) // still doubled, not diluted by the recurring income
  })

  it('sums a weekly recurring item across every occurrence within a monthly-filtered range', () => {
    const transactions = [
      tx({ date: '2026-09-01', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
      tx({ date: '2026-09-08', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
      tx({ date: '2026-09-15', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
      tx({ date: '2026-09-22', amountMinorUnits: 1000, recurringId: 'weekly-rent' }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.recurringBreakdown).toEqual([
      { recurringId: 'weekly-rent', type: 'expense', amountMinorUnits: 4000, count: 4 },
    ])
  })

  it('passes a monthly recurring item through as its single occurrence, keyed separately per item', () => {
    const transactions = [
      tx({ date: '2026-09-01', amountMinorUnits: 50000, type: 'expense', recurringId: 'rent' }),
      tx({ date: '2026-09-05', amountMinorUnits: 8000, type: 'income', recurringId: 'salary' }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    const byId = new Map(report.recurringBreakdown.map((e) => [e.recurringId, e]))
    expect(byId.get('rent')).toEqual({
      recurringId: 'rent',
      type: 'expense',
      amountMinorUnits: 50000,
      count: 1,
    })
    expect(byId.get('salary')).toEqual({
      recurringId: 'salary',
      type: 'income',
      amountMinorUnits: 8000,
      count: 1,
    })
  })

  it('omits a recurring item from the breakdown entirely when it has no occurrence in range', () => {
    const transactions = [
      tx({ date: '2026-08-15', amountMinorUnits: 50000, recurringId: 'rent' }), // last month, out of range
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    expect(report.recurringBreakdown).toEqual([])
  })
})

describe('buildReport — empty period', () => {
  it('returns zeroed totals and empty breakdowns, not an error', () => {
    const report = buildReport([], 'month', '2026-09-15', baseOpts)
    expect(report.income.totalMinorUnits).toBe(0)
    expect(report.expense.totalMinorUnits).toBe(0)
    expect(report.netMinorUnits).toBe(0)
    expect(report.categoryBreakdown.expense).toEqual([])
    expect(report.categoryBreakdown.income).toEqual([])
  })
})

describe('buildReport — sub-period buckets', () => {
  it('buckets a week into one entry per day, 7 total', () => {
    const report = buildReport([], 'week', '2026-09-15', baseOpts)
    expect(report.subPeriods).toHaveLength(7)
  })

  it('buckets a month into weeks', () => {
    const report = buildReport([], 'month', '2026-09-15', baseOpts)
    expect(report.subPeriods.length).toBeGreaterThanOrEqual(4)
    expect(report.subPeriods.length).toBeLessThanOrEqual(6)
    expect(report.subPeriods[0]?.label).toBe('W1')
  })

  it('buckets a financial year into 12 months', () => {
    const report = buildReport([], 'year', '2026-09-15', baseOpts)
    expect(report.subPeriods).toHaveLength(12)
  })

  it('buckets a day by category, not by time', () => {
    const transactions = [
      tx({ date: '2026-09-15', categoryId: 'food', type: 'expense', amountMinorUnits: 1000 }),
      tx({ date: '2026-09-15', categoryId: 'transport', type: 'expense', amountMinorUnits: 2000 }),
    ]
    const report = buildReport(transactions, 'day', '2026-09-15', baseOpts)
    expect(report.subPeriods.map((b) => b.label).sort()).toEqual(['food', 'transport'])
  })

  it('excludes income from the day bucketing — only expense categories appear', () => {
    const transactions = [
      tx({ date: '2026-09-15', categoryId: 'food', type: 'expense', amountMinorUnits: 1000 }),
      tx({ date: '2026-09-15', categoryId: 'salary', type: 'income', amountMinorUnits: 500000 }),
    ]
    const report = buildReport(transactions, 'day', '2026-09-15', baseOpts)
    expect(report.subPeriods.map((b) => b.label)).toEqual(['food'])
    expect(report.subPeriods[0]?.expenseMinorUnits).toBe(1000)
    expect(report.subPeriods[0]?.incomeMinorUnits).toBe(0)
  })

  it('labels a week bucket by weekday initial, in week-start order', () => {
    // 2026-09-14 is a Monday; with weekStartsOn=1 the week runs Mon..Sun.
    const report = buildReport([], 'week', '2026-09-16', { ...baseOpts, weekStartsOn: 1 })
    expect(report.subPeriods.map((b) => b.label)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S'])
  })

  it('shifts the week-bucket label order to match a Sunday week start', () => {
    const report = buildReport([], 'week', '2026-09-16', { ...baseOpts, weekStartsOn: 0 })
    expect(report.subPeriods.map((b) => b.label)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
  })

  it('sums correctly across sub-period buckets for a month', () => {
    const transactions = [
      tx({ type: 'expense', date: '2026-09-01', amountMinorUnits: 1000 }),
      tx({ type: 'expense', date: '2026-09-15', amountMinorUnits: 2000 }),
      tx({ type: 'expense', date: '2026-09-30', amountMinorUnits: 3000 }),
    ]
    const report = buildReport(transactions, 'month', '2026-09-15', baseOpts)
    const bucketSum = report.subPeriods.reduce((s, b) => s + b.expenseMinorUnits, 0)
    expect(bucketSum).toBe(6000)
  })

  it('sums correctly across sub-period buckets for a financial year', () => {
    const transactions = [
      tx({ type: 'expense', date: '2026-01-15', amountMinorUnits: 1000 }),
      tx({ type: 'expense', date: '2026-06-15', amountMinorUnits: 2000 }),
      tx({ type: 'expense', date: '2026-12-15', amountMinorUnits: 3000 }),
    ]
    const report = buildReport(transactions, 'year', '2026-06-15', baseOpts)
    const bucketSum = report.subPeriods.reduce((s, b) => s + b.expenseMinorUnits, 0)
    expect(bucketSum).toBe(6000)
  })
})

describe('isFuturePeriod', () => {
  it('is false for the current month', () => {
    expect(isFuturePeriod('month', '2026-09-15', baseOpts)).toBe(false)
  })
})

describe('buildCategoryTrend', () => {
  it('returns one label and one aligned value per series per window period, oldest first', () => {
    const transactions = [
      tx({ date: '2026-07-15', categoryId: 'food', amountMinorUnits: 1000 }),
      tx({ date: '2026-08-15', categoryId: 'food', amountMinorUnits: 2000 }),
      tx({ date: '2026-09-15', categoryId: 'food', amountMinorUnits: 3000 }),
    ]
    const trend = buildCategoryTrend(transactions, 'month', '2026-09-15', 'expense', 3, baseOpts)
    expect(trend.periodLabels).toHaveLength(3)
    const food = trend.series.find((s) => s.categoryId === 'food')
    expect(food?.values).toEqual([1000, 2000, 3000]) // Jul, Aug, Sep — oldest to newest
  })

  it('zero-fills a period where a category had no spend, rather than omitting the point', () => {
    const transactions = [
      tx({ date: '2026-07-15', categoryId: 'food', amountMinorUnits: 1000 }),
      // no food transaction in August
      tx({ date: '2026-09-15', categoryId: 'food', amountMinorUnits: 3000 }),
    ]
    const trend = buildCategoryTrend(transactions, 'month', '2026-09-15', 'expense', 3, baseOpts)
    const food = trend.series.find((s) => s.categoryId === 'food')
    expect(food?.values).toEqual([1000, 0, 3000])
  })

  it('keeps only the top categories by total-across-window and folds the rest into "other"', () => {
    // MAX_CATEGORY_SLICES - 1 categories get their own series; everything
    // past that is summed into one 'other' series, per category.
    const categoryCount = MAX_CATEGORY_SLICES + 2
    const transactions = Array.from({ length: categoryCount }, (_, i) =>
      tx({
        date: '2026-09-15',
        categoryId: `cat-${i}`,
        // Descending amounts so ranking is unambiguous: cat-0 is biggest.
        amountMinorUnits: (categoryCount - i) * 1000,
      }),
    )
    const trend = buildCategoryTrend(transactions, 'month', '2026-09-15', 'expense', 1, baseOpts)
    expect(trend.series).toHaveLength(MAX_CATEGORY_SLICES) // top (N-1) + one 'other'
    const seriesIds = trend.series.map((s) => s.categoryId)
    for (let i = 0; i < MAX_CATEGORY_SLICES - 1; i++) {
      expect(seriesIds).toContain(`cat-${i}`)
    }
    expect(seriesIds).toContain('other')

    const other = trend.series.find((s) => s.categoryId === 'other')
    const expectedOtherTotal = Array.from({ length: categoryCount }, (_, i) => i)
      .filter((i) => i >= MAX_CATEGORY_SLICES - 1)
      .reduce((sum, i) => sum + (categoryCount - i) * 1000, 0)
    expect(other?.values).toEqual([expectedOtherTotal])
  })

  it('omits the "other" series entirely when there are no extra categories to fold in', () => {
    const transactions = [
      tx({ date: '2026-09-15', categoryId: 'food', amountMinorUnits: 1000 }),
      tx({ date: '2026-09-15', categoryId: 'transport', amountMinorUnits: 2000 }),
    ]
    const trend = buildCategoryTrend(transactions, 'month', '2026-09-15', 'expense', 1, baseOpts)
    expect(trend.series.map((s) => s.categoryId).sort()).toEqual(['food', 'transport'])
  })

  it('only includes transactions of the requested type', () => {
    const transactions = [
      tx({ type: 'expense', date: '2026-09-15', categoryId: 'food', amountMinorUnits: 1000 }),
      tx({ type: 'income', date: '2026-09-15', categoryId: 'salary', amountMinorUnits: 500000 }),
    ]
    const expenseTrend = buildCategoryTrend(
      transactions,
      'month',
      '2026-09-15',
      'expense',
      1,
      baseOpts,
    )
    expect(expenseTrend.series.map((s) => s.categoryId)).toEqual(['food'])

    const incomeTrend = buildCategoryTrend(
      transactions,
      'month',
      '2026-09-15',
      'income',
      1,
      baseOpts,
    )
    expect(incomeTrend.series.map((s) => s.categoryId)).toEqual(['salary'])
  })
})

describe('buildReport — performance', () => {
  it('aggregates 5,000 transactions in under 100ms', () => {
    const transactions: Transaction[] = []
    for (let i = 0; i < 5000; i++) {
      const day = String((i % 28) + 1).padStart(2, '0')
      transactions.push(
        tx({
          type: i % 3 === 0 ? 'income' : 'expense',
          date: `2026-09-${day}`,
          categoryId: `cat-${i % 10}`,
          amountMinorUnits: 100 + i,
        }),
      )
    }
    const start = performance.now()
    buildReport(transactions, 'month', '2026-09-15', baseOpts)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })
})
