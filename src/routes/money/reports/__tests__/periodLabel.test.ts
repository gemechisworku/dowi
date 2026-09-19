import { describe, expect, it } from 'vitest'
import { getPeriodLabel } from '../periodLabel'

describe('getPeriodLabel', () => {
  it('formats a day', () => {
    expect(getPeriodLabel('day', { range: { start: '2026-09-19', end: '2026-09-19' } }, 1)).toBe(
      'September 19, 2026',
    )
  })
  it('formats a week as a short range', () => {
    expect(getPeriodLabel('week', { range: { start: '2026-09-14', end: '2026-09-20' } }, 1)).toBe(
      'Sep 14 – Sep 20',
    )
  })
  it('formats a month', () => {
    expect(getPeriodLabel('month', { range: { start: '2026-09-01', end: '2026-09-30' } }, 1)).toBe(
      'September 2026',
    )
  })
  it('formats a financial year using the FY label convention', () => {
    expect(getPeriodLabel('year', { range: { start: '2026-01-01', end: '2026-12-31' } }, 1)).toBe(
      'FY 2026',
    )
    expect(getPeriodLabel('year', { range: { start: '2026-07-01', end: '2027-06-30' } }, 7)).toBe(
      'FY 2026/27',
    )
  })
})
