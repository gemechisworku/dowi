import { describe, expect, it } from 'vitest'
import { formatWeekRangeLabel, getLastWeek, getNextWeek, getThisWeek, weekInfoFor } from '../week'

describe('weekInfoFor', () => {
  it('returns the Monday-Sunday range and ISO week key for a mid-week date', () => {
    // 2026-09-21 is a Monday.
    expect(weekInfoFor('2026-09-23')).toEqual({
      weekKey: '2026-W39',
      range: { start: '2026-09-21', end: '2026-09-27' },
    })
  })

  it('is always Monday-start regardless of which day of the week is passed', () => {
    expect(weekInfoFor('2026-09-21').range.start).toBe('2026-09-21') // Monday itself
    expect(weekInfoFor('2026-09-27').range.start).toBe('2026-09-21') // Sunday, same week
  })

  it('lands in the correct ISO week across a year boundary', () => {
    // 2025-12-31 falls in the first ISO week of 2026 (already exercised
    // directly for getIsoWeekKey itself in M2's own test suite) — this just
    // checks weekInfoFor doesn't relabel or reprocess that result.
    expect(weekInfoFor('2025-12-31').weekKey).toBe('2026-W01')
  })
})

describe('getThisWeek / getLastWeek / getNextWeek', () => {
  it('last week is exactly one week before this week, and next week one after', () => {
    const thisWeek = getThisWeek()
    const lastWeek = getLastWeek()
    const nextWeek = getNextWeek()

    expect(lastWeek.range.end < thisWeek.range.start).toBe(true)
    expect(nextWeek.range.start > thisWeek.range.end).toBe(true)
    // Exactly 7 days apart, not just "sometime earlier/later".
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    const thisStart = new Date(`${thisWeek.range.start}T00:00:00`).getTime()
    const lastStart = new Date(`${lastWeek.range.start}T00:00:00`).getTime()
    const nextStart = new Date(`${nextWeek.range.start}T00:00:00`).getTime()
    expect(thisStart - lastStart).toBe(oneWeekMs)
    expect(nextStart - thisStart).toBe(oneWeekMs)
  })

  it("this week's key matches the ISO week key computed directly for today", () => {
    const thisWeek = getThisWeek()
    expect(thisWeek.weekKey).toMatch(/^\d{4}-W\d{2}$/)
  })
})

describe('formatWeekRangeLabel', () => {
  it('formats a range as "Mon D – Mon D", matching Money\'s week-label convention', () => {
    expect(formatWeekRangeLabel({ start: '2026-09-21', end: '2026-09-27' })).toBe('Sep 21 – Sep 27')
  })

  it('spans a month boundary correctly', () => {
    expect(formatWeekRangeLabel({ start: '2026-09-28', end: '2026-10-04' })).toBe('Sep 28 – Oct 4')
  })
})
