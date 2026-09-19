import { describe, expect, it } from 'vitest'
import {
  convertMinorUnits,
  formatMinorUnits,
  formatMinorUnitsPlain,
  formatMoney,
  minorUnitExponent,
  parseAmountToMinorUnits,
  sumConverted,
} from '../money'

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

describe('formatMinorUnitsPlain', () => {
  it('never includes a thousands separator, unlike formatMinorUnits', () => {
    expect(formatMinorUnitsPlain(1842000, 'ETB')).toBe('18420.00')
    expect(formatMinorUnitsPlain(1235000, 'JPY')).toBe('1235000')
  })
  it('formats a 3-decimal currency', () => {
    expect(formatMinorUnitsPlain(1234, 'KWD')).toBe('1.234')
  })
  it('formats zero correctly', () => {
    expect(formatMinorUnitsPlain(0, 'ETB')).toBe('0.00')
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

describe('parseAmountToMinorUnits', () => {
  it('parses a plain 2-decimal amount', () => {
    expect(parseAmountToMinorUnits('124.50', 'ETB')).toBe(12450)
  })
  it('parses a whole number for a 2-decimal currency', () => {
    expect(parseAmountToMinorUnits('1234', 'ETB')).toBe(123400)
  })
  it('parses a 0-decimal currency with no fraction allowed', () => {
    expect(parseAmountToMinorUnits('1234', 'JPY')).toBe(1234)
  })
  it('parses a 3-decimal currency', () => {
    expect(parseAmountToMinorUnits('1.234', 'KWD')).toBe(1234)
  })
  it('parses zero', () => {
    expect(parseAmountToMinorUnits('0', 'ETB')).toBe(0)
    expect(parseAmountToMinorUnits('0.00', 'ETB')).toBe(0)
  })
  it('parses a leading-dot amount like ".50"', () => {
    expect(parseAmountToMinorUnits('.50', 'ETB')).toBe(50)
  })
  it('rejects an empty string', () => {
    expect(parseAmountToMinorUnits('', 'ETB')).toBeNull()
  })
  it('rejects a bare decimal point', () => {
    expect(parseAmountToMinorUnits('.', 'ETB')).toBeNull()
  })
  it('rejects more fraction digits than the currency allows', () => {
    expect(parseAmountToMinorUnits('1.234', 'ETB')).toBeNull()
  })
  it('rejects any fraction for a 0-decimal currency', () => {
    expect(parseAmountToMinorUnits('12.3', 'JPY')).toBeNull()
  })
  it('rejects a negative amount', () => {
    expect(parseAmountToMinorUnits('-5', 'ETB')).toBeNull()
  })
  it('rejects non-numeric input', () => {
    expect(parseAmountToMinorUnits('12e5', 'ETB')).toBeNull()
    expect(parseAmountToMinorUnits('abc', 'ETB')).toBeNull()
    expect(parseAmountToMinorUnits('1,234', 'ETB')).toBeNull()
  })
})

describe('convertMinorUnits', () => {
  it('is a no-op when converting a currency to itself, regardless of the rate', () => {
    expect(convertMinorUnits(12345, 'ETB', 'etb', 999)).toBe(12345)
  })
  it('converts between two 2-decimal currencies', () => {
    // 12.00 USD at a rate of 140 ETB per USD => 1,680.00 ETB
    expect(convertMinorUnits(1200, 'USD', 'ETB', 140)).toBe(168000)
  })
  it('converts from a 0-decimal currency to a 2-decimal one', () => {
    // 1000 JPY at 0.92 ETB per JPY => 920.00 ETB
    expect(convertMinorUnits(1000, 'JPY', 'ETB', 0.92)).toBe(92000)
  })
  it('converts from a 2-decimal currency to a 3-decimal one', () => {
    // 100.00 ETB at 0.0026 KWD per ETB => 0.260 KWD
    expect(convertMinorUnits(10000, 'ETB', 'KWD', 0.0026)).toBe(260)
  })
})

describe('sumConverted', () => {
  it('sums same-currency entries without needing any rate', () => {
    const result = sumConverted(
      [
        { amountMinorUnits: 10000, currency: 'ETB' },
        { amountMinorUnits: 5000, currency: 'ETB' },
      ],
      'ETB',
      () => undefined,
    )
    expect(result).toEqual({ totalMinorUnits: 15000, wasConverted: false, excluded: {} })
  })

  it('converts mixed-currency entries when a rate is available', () => {
    const result = sumConverted(
      [
        { amountMinorUnits: 10000, currency: 'ETB' },
        { amountMinorUnits: 1200, currency: 'USD' }, // -> 168000 at rate 140
      ],
      'ETB',
      (currency) => (currency === 'USD' ? 140 : undefined),
    )
    expect(result.totalMinorUnits).toBe(10000 + 168000)
    expect(result.wasConverted).toBe(true)
    expect(result.excluded).toEqual({})
  })

  it('excludes and reports entries whose currency has no rate, without dropping the count silently', () => {
    const result = sumConverted(
      [
        { amountMinorUnits: 10000, currency: 'ETB' },
        { amountMinorUnits: 500, currency: 'USD' },
        { amountMinorUnits: 700, currency: 'USD' },
      ],
      'ETB',
      () => undefined,
    )
    expect(result.totalMinorUnits).toBe(10000)
    expect(result.excluded).toEqual({ USD: 2 })
  })
})
