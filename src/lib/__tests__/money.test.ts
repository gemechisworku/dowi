import { describe, expect, it } from 'vitest'
import { formatMinorUnits, formatMoney, minorUnitExponent } from '../money'

describe('minorUnitExponent', () => {
  it('defaults to 2 decimal places', () => {
    expect(minorUnitExponent('ETB')).toBe(2)
    expect(minorUnitExponent('USD')).toBe(2)
  })
  it('is 0 for zero-decimal currencies', () => {
    expect(minorUnitExponent('JPY')).toBe(0)
    expect(minorUnitExponent('krw')).toBe(0)
  })
  it('is 3 for three-decimal currencies', () => {
    expect(minorUnitExponent('KWD')).toBe(3)
  })
})

describe('formatMinorUnits', () => {
  it('formats a 2-decimal currency with grouping', () => {
    expect(formatMinorUnits(1842000, 'ETB')).toBe('18,420.00')
  })
  it('formats a 0-decimal currency with no fraction', () => {
    expect(formatMinorUnits(1235, 'JPY')).toBe('1,235')
  })
  it('formats a 3-decimal currency', () => {
    expect(formatMinorUnits(1234, 'KWD')).toBe('1.234')
  })
  it('formats zero correctly', () => {
    expect(formatMinorUnits(0, 'ETB')).toBe('0.00')
  })
})

describe('formatMoney', () => {
  it('shows the currency code by default', () => {
    expect(formatMoney(12450, 'ETB')).toBe('ETB 124.50')
  })
  it('can hide the currency code', () => {
    expect(formatMoney(12450, 'ETB', { showCurrency: false })).toBe('124.50')
  })
  it('shows a + sign for positive amounts when requested', () => {
    expect(formatMoney(12450, 'ETB', { showSign: true })).toBe('+ETB 124.50')
  })
  it('shows a - sign for negative amounts regardless of showSign', () => {
    expect(formatMoney(-12450, 'ETB')).toBe('-ETB 124.50')
    expect(formatMoney(-12450, 'ETB', { showSign: true })).toBe('-ETB 124.50')
  })
  it('never shows a sign for zero even when showSign is true', () => {
    expect(formatMoney(0, 'ETB', { showSign: true })).toBe('ETB 0.00')
  })
  it('marks an approximate (converted) amount', () => {
    expect(formatMoney(168000, 'USD', { approximate: true })).toBe('≈USD 1,680.00')
  })
})
