import { describe, expect, it } from 'vitest'
import { getUsageWeekNumber } from '../usageWeek'

describe('getUsageWeekNumber', () => {
  it('is week 1 on the day the app was first used', () => {
    const installedAt = '2026-09-22T09:00:00.000Z'
    const now = new Date('2026-09-22T21:00:00.000Z')
    expect(getUsageWeekNumber(installedAt, now)).toBe(1)
  })

  it('stays week 1 through day 7', () => {
    const installedAt = '2026-09-22T09:00:00.000Z'
    const now = new Date('2026-09-28T09:00:00.000Z')
    expect(getUsageWeekNumber(installedAt, now)).toBe(1)
  })

  it('rolls over to week 2 on day 8', () => {
    const installedAt = '2026-09-22T09:00:00.000Z'
    const now = new Date('2026-09-29T09:00:00.000Z')
    expect(getUsageWeekNumber(installedAt, now)).toBe(2)
  })

  it('matches real elapsed weeks for a long-time user (the September case from the bug report)', () => {
    // Installed in week 1 of the year; "now" is calendar week 39 — but
    // usage week should reflect actual days-since-install, not the ISO
    // week number, and this case is deliberately far from any coincidence
    // between the two.
    const installedAt = '2026-01-05T09:00:00.000Z'
    const now = new Date('2026-01-19T09:00:00.000Z') // exactly 14 days later
    expect(getUsageWeekNumber(installedAt, now)).toBe(3)
  })

  it('falls back to week 1 when there is no installedAt baseline', () => {
    expect(getUsageWeekNumber(undefined, new Date('2026-09-22'))).toBe(1)
  })

  it('falls back to week 1 for an unparseable installedAt', () => {
    expect(getUsageWeekNumber('not-a-date', new Date('2026-09-22'))).toBe(1)
  })

  it('falls back to week 1 if installedAt is somehow after now (clock skew)', () => {
    const installedAt = '2026-09-22T09:00:00.000Z'
    const now = new Date('2026-09-20T09:00:00.000Z')
    expect(getUsageWeekNumber(installedAt, now)).toBe(1)
  })

  it('is not affected by time-of-day, only calendar date', () => {
    const installedAt = '2026-09-22T23:50:00.000Z'
    const now = new Date('2026-09-23T00:10:00.000Z')
    expect(getUsageWeekNumber(installedAt, now)).toBe(1)
  })
})
