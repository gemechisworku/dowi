import { describe, expect, it } from 'vitest'
import {
  getFinancialYearLabel,
  getFinancialYearRange,
  getHalfYearLabel,
  getHalfYearRange,
  getIsoWeekKey,
  getMonthRange,
  getQuarterLabel,
  getQuarterRange,
  getRangeForPeriod,
  getWeekRange,
  shiftPeriod,
} from '../period'

describe('getWeekRange', () => {
  it('computes a Monday-start week', () => {
    // 2026-09-19 is a Saturday.
    expect(getWeekRange('2026-09-19', 1)).toEqual({ start: '2026-09-14', end: '2026-09-20' })
  })

  it('computes a Sunday-start week for the same date', () => {
    expect(getWeekRange('2026-09-19', 0)).toEqual({ start: '2026-09-13', end: '2026-09-19' })
  })

  it('handles a week that crosses a year boundary', () => {
    // 2026-12-31 is a Thursday; Monday-start week spans Dec into Jan 2027.
    expect(getWeekRange('2026-12-31', 1)).toEqual({ start: '2026-12-28', end: '2027-01-03' })
  })
})

describe('getMonthRange', () => {
  it('computes calendar month bounds', () => {
    expect(getMonthRange('2026-09-19')).toEqual({ start: '2026-09-01', end: '2026-09-30' })
  })

  it('handles February in a leap year', () => {
    expect(getMonthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })

  it('handles February in a non-leap year', () => {
    expect(getMonthRange('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })
})

describe('getFinancialYearRange', () => {
  it('is a plain calendar year for a January start', () => {
    expect(getFinancialYearRange('2026-09-19', 1)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    })
  })

  it('spans two calendar years for a July start', () => {
    expect(getFinancialYearRange('2026-09-19', 7)).toEqual({
      start: '2026-07-01',
      end: '2027-06-30',
    })
  })

  it('places a date just before the FY-start month in the previous FY', () => {
    expect(getFinancialYearRange('2026-06-15', 7)).toEqual({
      start: '2025-07-01',
      end: '2026-06-30',
    })
  })

  it('a 15 June and a 15 July date fall in different FYs when the FY starts in July', () => {
    const june = getFinancialYearRange('2026-06-15', 7)
    const july = getFinancialYearRange('2026-07-15', 7)
    expect(june).not.toEqual(july)
  })
})

describe('getFinancialYearLabel', () => {
  it('is a single year for a January start', () => {
    const range = getFinancialYearRange('2026-09-19', 1)
    expect(getFinancialYearLabel(range, 1)).toBe('FY 2026')
  })

  it('is a year range for a mid-year start', () => {
    const range = getFinancialYearRange('2026-09-19', 7)
    expect(getFinancialYearLabel(range, 7)).toBe('FY 2026/27')
  })
})

describe('getQuarterRange', () => {
  it('aligns quarters to a January-start FY', () => {
    // Sep 19 is month index 8 (0-based) into a Jan-start FY -> block 2 (Jul-Sep) -> Q3.
    expect(getQuarterRange('2026-09-19', 1)).toEqual({ start: '2026-07-01', end: '2026-09-30' })
    expect(getQuarterRange('2026-01-05', 1)).toEqual({ start: '2026-01-01', end: '2026-03-31' })
  })

  it('aligns quarters to a mid-year (July-start) FY', () => {
    // FY starting July 2026 runs Jul 2026 - Jun 2027. Sep 2026 is month 2 into it -> Q1.
    expect(getQuarterRange('2026-09-19', 7)).toEqual({ start: '2026-07-01', end: '2026-09-30' })
    // Jan 2027 is month 6 into the same FY -> Q3.
    expect(getQuarterRange('2027-01-15', 7)).toEqual({ start: '2027-01-01', end: '2027-03-31' })
  })
})

describe('getHalfYearRange', () => {
  it('aligns halves to a January-start FY', () => {
    expect(getHalfYearRange('2026-09-19', 1)).toEqual({ start: '2026-07-01', end: '2026-12-31' })
    expect(getHalfYearRange('2026-03-19', 1)).toEqual({ start: '2026-01-01', end: '2026-06-30' })
  })

  it('aligns halves to a mid-year (July-start) FY', () => {
    // FY starting July 2026 runs Jul 2026 - Jun 2027. Sep 2026 is in H1.
    expect(getHalfYearRange('2026-09-19', 7)).toEqual({ start: '2026-07-01', end: '2026-12-31' })
    // Feb 2027 is in H2.
    expect(getHalfYearRange('2027-02-15', 7)).toEqual({ start: '2027-01-01', end: '2027-06-30' })
  })
})

describe('getQuarterLabel', () => {
  it('numbers quarters relative to a January-start FY', () => {
    expect(getQuarterLabel(getQuarterRange('2026-09-19', 1), 1)).toBe('Q3 FY 2026')
  })

  it('numbers quarters relative to a mid-year FY', () => {
    expect(getQuarterLabel(getQuarterRange('2026-09-19', 7), 7)).toBe('Q1 FY 2026/27')
    expect(getQuarterLabel(getQuarterRange('2027-01-15', 7), 7)).toBe('Q3 FY 2026/27')
  })
})

describe('getHalfYearLabel', () => {
  it('numbers halves relative to a January-start FY', () => {
    expect(getHalfYearLabel(getHalfYearRange('2026-09-19', 1), 1)).toBe('H2 FY 2026')
    expect(getHalfYearLabel(getHalfYearRange('2026-03-19', 1), 1)).toBe('H1 FY 2026')
  })

  it('numbers halves relative to a mid-year FY', () => {
    expect(getHalfYearLabel(getHalfYearRange('2026-09-19', 7), 7)).toBe('H1 FY 2026/27')
    expect(getHalfYearLabel(getHalfYearRange('2027-02-15', 7), 7)).toBe('H2 FY 2026/27')
  })
})

describe('getRangeForPeriod', () => {
  const opts = { weekStartsOn: 1, fyStartMonth: 1 }

  it('returns a single-day range for "day"', () => {
    expect(getRangeForPeriod('day', '2026-09-19', opts)).toEqual({
      start: '2026-09-19',
      end: '2026-09-19',
    })
  })

  it('delegates to the matching helper for week/month/quarter/halfYear/year', () => {
    expect(getRangeForPeriod('week', '2026-09-19', opts)).toEqual(getWeekRange('2026-09-19', 1))
    expect(getRangeForPeriod('month', '2026-09-19', opts)).toEqual(getMonthRange('2026-09-19'))
    expect(getRangeForPeriod('quarter', '2026-09-19', opts)).toEqual(
      getQuarterRange('2026-09-19', 1),
    )
    expect(getRangeForPeriod('halfYear', '2026-09-19', opts)).toEqual(
      getHalfYearRange('2026-09-19', 1),
    )
    expect(getRangeForPeriod('year', '2026-09-19', opts)).toEqual(
      getFinancialYearRange('2026-09-19', 1),
    )
  })

  it('delegates to the matching helper for a mid-year FY start too', () => {
    const midYearOpts = { weekStartsOn: 1, fyStartMonth: 7 }
    expect(getRangeForPeriod('quarter', '2026-09-19', midYearOpts)).toEqual(
      getQuarterRange('2026-09-19', 7),
    )
    expect(getRangeForPeriod('halfYear', '2026-09-19', midYearOpts)).toEqual(
      getHalfYearRange('2026-09-19', 7),
    )
  })
})

describe('shiftPeriod', () => {
  it('steps a month backward and forward', () => {
    expect(shiftPeriod('month', '2026-09-19', -1)).toBe('2026-08-19')
    expect(shiftPeriod('month', '2026-09-19', 1)).toBe('2026-10-19')
  })

  it('steps a week by 7 days', () => {
    expect(shiftPeriod('week', '2026-09-19', 1)).toBe('2026-09-26')
  })

  it('steps a quarter by 3 months', () => {
    expect(shiftPeriod('quarter', '2026-09-19', -1)).toBe('2026-06-19')
    expect(shiftPeriod('quarter', '2026-09-19', 1)).toBe('2026-12-19')
  })

  it('steps a half-year by 6 months', () => {
    expect(shiftPeriod('halfYear', '2026-09-19', -1)).toBe('2026-03-19')
    expect(shiftPeriod('halfYear', '2026-09-19', 1)).toBe('2027-03-19')
  })

  it('steps a year', () => {
    expect(shiftPeriod('year', '2026-09-19', -1)).toBe('2025-09-19')
  })
})

describe('getIsoWeekKey', () => {
  it('matches the ISO week number for an ordinary mid-year date', () => {
    // 2026-09-19 is a Saturday in ISO week 38 of 2026.
    expect(getIsoWeekKey('2026-09-19')).toBe('2026-W38')
  })

  it('assigns the last days of December to week 1 of the next ISO year when applicable', () => {
    // 2024-12-31 is a Tuesday, so its week's Thursday (2025-01-02) falls in
    // 2025 — it belongs to ISO week 1 of 2025, not week 53 of 2024.
    expect(getIsoWeekKey('2024-12-31')).toBe('2025-W01')
  })

  it('assigns the first days of January to the previous ISO year´s last week when applicable', () => {
    // 2027-01-01 is a Friday; its week's Thursday (2026-12-31) falls in
    // 2026 — it belongs to ISO week 53 of 2026, not week 1 of 2027.
    expect(getIsoWeekKey('2027-01-01')).toBe('2026-W53')
  })
})
