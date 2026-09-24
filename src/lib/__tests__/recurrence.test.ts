import { describe, expect, it } from 'vitest'
import { computeDueRecurring, formatIntervalLabel, occurrenceAt } from '../recurrence'
import type { AppNotification, RecurringTransaction } from '@/db/types'

function baseTemplate(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  const now = new Date().toISOString()
  return {
    id: 'r1',
    name: 'Rent',
    type: 'expense',
    amountMinorUnits: 500000,
    currency: 'ETB',
    categoryId: 'cat-1',
    tags: [],
    interval: { unit: 'month', every: 1 },
    startDate: '2026-01-31',
    autoRecord: true,
    occurrenceIndex: 0,
    nextDueDate: '2026-01-31',
    paused: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function baseNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  const now = new Date().toISOString()
  return {
    id: 'n1',
    type: 'recurring-due',
    title: 'Rent',
    body: 'Due today',
    scheduledFor: now,
    read: false,
    createdAt: now,
    ...overrides,
  }
}

describe('occurrenceAt', () => {
  it('adds every*7*index days for a week unit', () => {
    expect(occurrenceAt('2026-01-05', { unit: 'week', every: 1 }, 0)).toBe('2026-01-05')
    expect(occurrenceAt('2026-01-05', { unit: 'week', every: 1 }, 1)).toBe('2026-01-12')
    expect(occurrenceAt('2026-01-05', { unit: 'week', every: 2 }, 1)).toBe('2026-01-19')
    expect(occurrenceAt('2026-01-05', { unit: 'week', every: 2 }, 3)).toBe('2026-02-16')
  })

  it('advances plain months with no clamping needed', () => {
    expect(occurrenceAt('2026-01-15', { unit: 'month', every: 1 }, 0)).toBe('2026-01-15')
    expect(occurrenceAt('2026-01-15', { unit: 'month', every: 1 }, 1)).toBe('2026-02-15')
    expect(occurrenceAt('2026-01-15', { unit: 'month', every: 1 }, 11)).toBe('2026-12-15')
    expect(occurrenceAt('2026-01-15', { unit: 'month', every: 1 }, 12)).toBe('2027-01-15')
  })

  it('clamps the 31st into a 30-day month', () => {
    // 2026-04-30 is the last day of April.
    expect(occurrenceAt('2026-01-31', { unit: 'month', every: 1 }, 3)).toBe('2026-04-30')
  })

  it('clamps the 31st into February of a non-leap year', () => {
    expect(occurrenceAt('2026-01-31', { unit: 'month', every: 1 }, 1)).toBe('2026-02-28')
  })

  it('clamps the 31st into February of a leap year', () => {
    expect(occurrenceAt('2028-01-31', { unit: 'month', every: 1 }, 1)).toBe('2028-02-29')
  })

  it('never permanently drifts from repeated clamping — each occurrence is computed fresh from the original anchor', () => {
    // Anchored on Jan 31: Feb (index 1) clamps to 28, but Mar (index 2) must
    // still land on 31 — a chained/naive implementation that advanced from
    // the *previous* (clamped) occurrence would wrongly produce Mar 28.
    const anchor = '2026-01-31'
    const interval = { unit: 'month' as const, every: 1 }
    expect(occurrenceAt(anchor, interval, 1)).toBe('2026-02-28')
    expect(occurrenceAt(anchor, interval, 2)).toBe('2026-03-31')
    expect(occurrenceAt(anchor, interval, 3)).toBe('2026-04-30')
    expect(occurrenceAt(anchor, interval, 4)).toBe('2026-05-31')
  })

  it('handles every-N-months intervals', () => {
    expect(occurrenceAt('2026-01-31', { unit: 'month', every: 3 }, 1)).toBe('2026-04-30')
    expect(occurrenceAt('2026-01-31', { unit: 'month', every: 3 }, 2)).toBe('2026-07-31')
  })

  it('advances plain years with the month/day held fixed', () => {
    expect(occurrenceAt('2026-06-15', { unit: 'year', every: 1 }, 0)).toBe('2026-06-15')
    expect(occurrenceAt('2026-06-15', { unit: 'year', every: 1 }, 3)).toBe('2029-06-15')
  })

  it('clamps a Feb-29 yearly anchor down to Feb 28 on non-leap years, independently each time', () => {
    const anchor = '2028-02-29' // 2028 is a leap year
    const interval = { unit: 'year' as const, every: 1 }
    expect(occurrenceAt(anchor, interval, 1)).toBe('2029-02-28') // non-leap
    expect(occurrenceAt(anchor, interval, 2)).toBe('2030-02-28') // non-leap
    expect(occurrenceAt(anchor, interval, 4)).toBe('2032-02-29') // leap again
  })

  it('handles every-N-years intervals', () => {
    expect(occurrenceAt('2026-03-10', { unit: 'year', every: 2 }, 2)).toBe('2030-03-10')
  })
})

describe('formatIntervalLabel', () => {
  it('formats every unit at every=1 as its simple adverb', () => {
    expect(formatIntervalLabel({ unit: 'week', every: 1 })).toBe('Weekly')
    expect(formatIntervalLabel({ unit: 'month', every: 1 })).toBe('Monthly')
    expect(formatIntervalLabel({ unit: 'year', every: 1 })).toBe('Yearly')
  })

  it('formats every>1 as "Every N <unit>s"', () => {
    expect(formatIntervalLabel({ unit: 'week', every: 2 })).toBe('Every 2 weeks')
    expect(formatIntervalLabel({ unit: 'month', every: 3 })).toBe('Every 3 months')
    expect(formatIntervalLabel({ unit: 'year', every: 5 })).toBe('Every 5 years')
  })
})

describe('computeDueRecurring — auto-record', () => {
  it('backfills every missed occurrence in one batch, oldest first', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
      autoRecord: true,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-04-15',
    })
    expect(result.remind).toEqual([])
    expect(result.autoRecord).toHaveLength(1)
    const batch = result.autoRecord[0]!
    expect(batch.occurrences).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'])
    expect(batch.finalOccurrenceIndex).toBe(4)
    expect(batch.finalNextDueDate).toBe('2026-05-15')
    expect(batch.finalLastGeneratedDate).toBe('2026-04-15')
  })

  it('produces nothing when the next occurrence is still in the future', () => {
    const template = baseTemplate({ startDate: '2026-05-15', occurrenceIndex: 0 })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-04-15',
    })
    expect(result.autoRecord).toEqual([])
  })

  it('is idempotent: an occurrence already present as a transaction is not re-added, but state still advances past it', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [
        { recurringId: 'r1', date: '2026-01-15' },
        { recurringId: 'r1', date: '2026-02-15' },
      ],
      existingNotifications: [],
      today: '2026-03-15',
    })
    expect(result.autoRecord).toHaveLength(1)
    const batch = result.autoRecord[0]!
    // Only the un-recorded occurrence is (re-)created...
    expect(batch.occurrences).toEqual(['2026-03-15'])
    // ...but the state still reflects all three having been walked through.
    expect(batch.finalOccurrenceIndex).toBe(3)
    expect(batch.finalNextDueDate).toBe('2026-04-15')
  })

  it('a running call (repeated catch-up) with nothing new due produces no batch at all', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [{ recurringId: 'r1', date: '2026-01-15' }],
      existingNotifications: [],
      today: '2026-01-15',
    })
    expect(result.autoRecord).toEqual([])
  })

  it('a transaction belonging to a different template does not dedup this one', () => {
    const template = baseTemplate({ id: 'r1', startDate: '2026-01-15', occurrenceIndex: 0 })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [{ recurringId: 'other-template', date: '2026-01-15' }],
      existingNotifications: [],
      today: '2026-01-15',
    })
    expect(result.autoRecord).toHaveLength(1)
    expect(result.autoRecord[0]!.occurrences).toEqual(['2026-01-15'])
  })

  it('stops producing occurrences once past endDate, even though today is later', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      endDate: '2026-02-28',
      occurrenceIndex: 0,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-06-01',
    })
    expect(result.autoRecord).toHaveLength(1)
    expect(result.autoRecord[0]!.occurrences).toEqual(['2026-01-15', '2026-02-15'])
  })

  it('produces nothing once occurrenceIndex has already walked past endDate', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      endDate: '2026-02-28',
      occurrenceIndex: 2, // already past both Jan and Feb occurrences
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-12-31',
    })
    expect(result.autoRecord).toEqual([])
  })

  it('respects maxBackfill as a hard cap on how many occurrences are walked', () => {
    const template = baseTemplate({
      interval: { unit: 'week', every: 1 },
      startDate: '2020-01-01',
      occurrenceIndex: 0,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-09-24',
      maxBackfill: 5,
    })
    expect(result.autoRecord).toHaveLength(1)
    expect(result.autoRecord[0]!.occurrences).toHaveLength(5)
  })
})

describe('computeDueRecurring — remind-and-confirm', () => {
  it('emits only the earliest outstanding occurrence, not a backlog', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
      autoRecord: false,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-04-15',
    })
    expect(result.autoRecord).toEqual([])
    expect(result.remind).toHaveLength(1)
    const reminder = result.remind[0]!
    expect(reminder.dueDate).toBe('2026-01-15')
    expect(reminder.deepLink).toBe('/money/recurring/confirm?id=r1&due=2026-01-15')
    expect(reminder.title).toBe('Rent')
  })

  it('does not advance any state on its own — the same earliest occurrence keeps reappearing until confirmed', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
      autoRecord: false,
    })
    const first = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-03-15',
    })
    // Simulate a second catch-up run with the exact same (unconfirmed) template.
    const second = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-03-15',
    })
    expect(first.remind[0]!.dueDate).toBe(second.remind[0]!.dueDate)
    expect(first.remind[0]!.scheduledFor).toBe(second.remind[0]!.scheduledFor)
  })

  it('is deduped against an existing notification with the same scheduledFor + deepLink', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
      autoRecord: false,
    })
    const existingNotifications = [
      baseNotification({
        type: 'recurring-due',
        scheduledFor: '2026-01-15T09:00:00.000Z',
        deepLink: '/money/recurring/confirm?id=r1&due=2026-01-15',
      }),
    ]
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications,
      today: '2026-01-15',
    })
    expect(result.remind).toEqual([])
  })

  it('a differently-typed existing notification with the same scheduledFor/deepLink does not suppress it', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      occurrenceIndex: 0,
      autoRecord: false,
    })
    const existingNotifications = [
      baseNotification({
        type: 'task-due',
        scheduledFor: '2026-01-15T09:00:00.000Z',
        deepLink: '/money/recurring/confirm?id=r1&due=2026-01-15',
      }),
    ]
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications,
      today: '2026-01-15',
    })
    expect(result.remind).toHaveLength(1)
  })

  it('produces nothing once endDate has passed', () => {
    const template = baseTemplate({
      interval: { unit: 'month', every: 1 },
      startDate: '2026-01-15',
      endDate: '2026-01-20',
      occurrenceIndex: 1, // Jan already confirmed
      autoRecord: false,
    })
    const result = computeDueRecurring({
      templates: [template],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-12-31',
    })
    expect(result.remind).toEqual([])
  })
})

describe('computeDueRecurring — multiple templates', () => {
  it('handles a mix of auto-record and remind templates independently', () => {
    const auto = baseTemplate({
      id: 'auto-1',
      autoRecord: true,
      startDate: '2026-01-01',
      interval: { unit: 'month', every: 1 },
      occurrenceIndex: 0,
    })
    const remind = baseTemplate({
      id: 'remind-1',
      autoRecord: false,
      startDate: '2026-01-01',
      interval: { unit: 'month', every: 1 },
      occurrenceIndex: 0,
    })
    const result = computeDueRecurring({
      templates: [auto, remind],
      existingTransactions: [],
      existingNotifications: [],
      today: '2026-01-01',
    })
    expect(result.autoRecord).toHaveLength(1)
    expect(result.autoRecord[0]!.template.id).toBe('auto-1')
    expect(result.remind).toHaveLength(1)
    expect(result.remind[0]!.template.id).toBe('remind-1')
  })
})
