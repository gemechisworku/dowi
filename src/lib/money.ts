/**
 * Minimal money-formatting helper for the component library (M1).
 * The full parse/sum/convert logic (PRD §5.3, D3) is built in M2 — this
 * only covers what MoneyText needs to *display* an already-known integer
 * minor-units amount correctly per currency.
 */

// Currencies whose minor unit is not 2 decimal places.
const ZERO_DECIMAL: ReadonlySet<string> = new Set(['JPY', 'KRW', 'CLP', 'VND', 'ISK'])
const THREE_DECIMAL: ReadonlySet<string> = new Set(['KWD', 'BHD', 'OMR', 'JOD', 'TND'])

export function minorUnitExponent(currency: string): number {
  const code = currency.toUpperCase()
  if (ZERO_DECIMAL.has(code)) return 0
  if (THREE_DECIMAL.has(code)) return 3
  return 2
}

/** Formats an integer minor-units amount as "1,234.50" (grouping, fixed decimals). */
export function formatMinorUnits(amountMinorUnits: number, currency: string): string {
  const exponent = minorUnitExponent(currency)
  const divisor = 10 ** exponent
  const value = amountMinorUnits / divisor
  return value.toLocaleString('en-US', {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  })
}

export interface FormatMoneyOptions {
  /** Prepend the currency code, e.g. "ETB 1,234.50". Default true. */
  showCurrency?: boolean
  /** Prefix with "+"/"-" based on sign. Default false. */
  showSign?: boolean
  /** Prefix with "≈" to mark a converted amount. Default false. */
  approximate?: boolean
}

export function formatMoney(
  amountMinorUnits: number,
  currency: string,
  options: FormatMoneyOptions = {},
): string {
  const { showCurrency = true, showSign = false, approximate = false } = options
  const sign = amountMinorUnits < 0 ? '-' : showSign && amountMinorUnits > 0 ? '+' : ''
  const magnitude = formatMinorUnits(Math.abs(amountMinorUnits), currency)
  const parts = [
    approximate ? '≈' : '',
    sign,
    showCurrency ? `${currency.toUpperCase()} ` : '',
    magnitude,
  ]
  return parts.join('')
}
