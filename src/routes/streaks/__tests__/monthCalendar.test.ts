import { describe, expect, it } from 'vitest'
import {
  buildMonthGrid,
  getCurrentStreakDates,
  getMonthLabel,
  intensityLevel,
  shiftMonthKey,
} from '../monthCalendar'

describe('getMonthLabel', () => {
  it('formats a "YYYY-MM" key as a human month/year label', () => {
    expect(getMonthLabel('2026-06')).toBe('June 2026')
  })
})

describe('shiftMonthKey', () => {
  it('steps forward and back a month', () => {
    expect(shiftMonthKey('2026-06', 1)).toBe('2026-07')
    expect(shiftMonthKey('2026-06', -1)).toBe('2026-05')
  })

  it('rolls over a year boundary', () => {
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
  })
})

describe('buildMonthGrid', () => {
  it('pads the first week so the 1st lands under its real weekday (Sunday-start)', () => {
    // June 1, 2026 is a Monday.
    const weeks = buildMonthGrid('2026-06', 0, new Map())
    expect(weeks[0]?.map((c) => c.date)).toEqual([
      null,
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
    ])
  })

  it('shifts padding when the week starts on Monday instead', () => {
    const weeks = buildMonthGrid('2026-06', 1, new Map())
    // Monday-start: June 1 (a Monday) needs zero leading blanks.
    expect(weeks[0]?.map((c) => c.date)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ])
  })

  it('every week row has exactly 7 cells, including a trailing padded week', () => {
    const weeks = buildMonthGrid('2026-06', 0, new Map())
    for (const week of weeks) expect(week).toHaveLength(7)
    // June 2026 has 30 days starting on a Monday — needs a June 30 in the
    // last row plus trailing nulls, not a dropped day.
    const allDates = weeks.flat().map((c) => c.date)
    expect(allDates).toContain('2026-06-30')
  })

  it('reads each day’s count from the activity map, defaulting to 0', () => {
    const activity = new Map([
      ['2026-06-01', 2],
      ['2026-06-15', 5],
    ])
    const weeks = buildMonthGrid('2026-06', 0, activity)
    const byDate = new Map(weeks.flat().map((c) => [c.date, c.count]))
    expect(byDate.get('2026-06-01')).toBe(2)
    expect(byDate.get('2026-06-15')).toBe(5)
    expect(byDate.get('2026-06-02')).toBe(0)
  })
})

describe('intensityLevel', () => {
  it('buckets a raw count into a fixed 0-4 scale', () => {
    expect(intensityLevel(0)).toBe(0)
    expect(intensityLevel(1)).toBe(1)
    expect(intensityLevel(2)).toBe(2)
    expect(intensityLevel(3)).toBe(3)
    expect(intensityLevel(4)).toBe(3)
    expect(intensityLevel(5)).toBe(4)
    expect(intensityLevel(100)).toBe(4)
  })
})

describe('getCurrentStreakDates', () => {
  it('is empty with no active streak', () => {
    expect(getCurrentStreakDates(null, 0)).toEqual(new Set())
    expect(getCurrentStreakDates('2026-06-10', 0)).toEqual(new Set())
  })

  it('includes every day back from lastActiveDate, currentStreak days total', () => {
    const dates = getCurrentStreakDates('2026-06-10', 3)
    expect(dates).toEqual(new Set(['2026-06-10', '2026-06-09', '2026-06-08']))
  })

  it('crosses a month boundary correctly', () => {
    const dates = getCurrentStreakDates('2026-06-01', 2)
    expect(dates).toEqual(new Set(['2026-06-01', '2026-05-31']))
  })
})
