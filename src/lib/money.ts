/**
 * Money helpers (PRD §5.3, D3). Amounts are always integer minor units —
 * never floats — so a transaction's stored value is exact. Conversion
 * necessarily reintroduces floating-point (an FX rate is itself an
 * imprecise, user-entered estimate), so it happens only at the edges
 * (display/reporting), rounded back to integer minor units immediately.
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

/** Formats an integer minor-units amount as "1,234.50" (grouping, fixed decimals) — for on-screen display. */
export function formatMinorUnits(amountMinorUnits: number, currency: string): string {
  const exponent = minorUnitExponent(currency)
  const divisor = 10 ** exponent
  const value = amountMinorUnits / divisor
  return value.toLocaleString('en-US', {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  })
}

/**
 * Formats an integer minor-units amount as a plain decimal string with no
 * thousands separator — e.g. "1500" (JPY) or "1234.50" (ETB), never
 * "1,234.50". For CSV/data-interchange output, where a locale-formatted
 * grouping separator is at best noise and at worst (in a comma-decimal
 * locale reading the file) actively misparsed as a different number.
 */
export function formatMinorUnitsPlain(amountMinorUnits: number, currency: string): string {
  const exponent = minorUnitExponent(currency)
  const divisor = 10 ** exponent
  return (amountMinorUnits / divisor).toFixed(exponent)
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

/**
 * Parses a plain decimal string (as typed, e.g. via AmountKeypad) into
 * integer minor units for the given currency. Returns `null` for anything
 * that isn't a valid non-negative amount — empty string, a bare ".", too
 * many fraction digits for the currency, or a negative/non-numeric value.
 * Never accepts scientific notation or thousands separators; those aren't
 * something the keypad can produce.
 */
export function parseAmountToMinorUnits(input: string, currency: string): number | null {
  if (!/^\d*\.?\d*$/.test(input) || input === '' || input === '.') return null

  const exponent = minorUnitExponent(currency)
  const [wholePart, fractionPart = ''] = input.split('.')
  if (fractionPart.length > exponent) return null

  const paddedFraction = fractionPart.padEnd(exponent, '0')
  const digits = `${wholePart || '0'}${paddedFraction}`
  const minorUnits = Number.parseInt(digits, 10)
  return Number.isSafeInteger(minorUnits) ? minorUnits : null
}

/**
 * Converts an integer minor-units amount from one currency to another
 * using a user-supplied rate (PRD §5.3: "1 <currency> = <rate> <base>").
 * Passing the same currency for both is always a no-op, regardless of
 * `rateFromToTarget` — this is what lets callers skip a rate lookup
 * entirely for the (extremely common) case of an amount already in the
 * base currency.
 */
export function convertMinorUnits(
  amountMinorUnits: number,
  fromCurrency: string,
  toCurrency: string,
  rateFromToTarget: number,
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amountMinorUnits
  const fromMajor = amountMinorUnits / 10 ** minorUnitExponent(fromCurrency)
  const toMajor = fromMajor * rateFromToTarget
  return Math.round(toMajor * 10 ** minorUnitExponent(toCurrency))
}

export interface MoneyEntry {
  amountMinorUnits: number
  currency: string
}

export interface ConvertedSum {
  /** Sum of every entry, in `baseCurrency` minor units. */
  totalMinorUnits: number
  /** True if at least one entry was in a currency other than baseCurrency (i.e. the total is a "≈"). */
  wasConverted: boolean
  /** Currencies with no available rate, and how many entries were skipped for each — never silently dropped (PRD AC-M7). */
  excluded: Record<string, number>
}

/**
 * Sums a list of amounts into a single base-currency total, converting each
 * non-base entry via `getRate` (typically backed by the rates repository).
 * An entry whose currency has no rate is excluded from the total *and*
 * reported in `excluded`, so the caller can surface it rather than quietly
 * under-counting — see PRD §5.3 and AC-M7.
 */
export function sumConverted(
  entries: MoneyEntry[],
  baseCurrency: string,
  getRate: (currency: string) => number | undefined,
): ConvertedSum {
  let totalMinorUnits = 0
  let wasConverted = false
  const excluded: Record<string, number> = {}

  for (const entry of entries) {
    if (entry.currency.toUpperCase() === baseCurrency.toUpperCase()) {
      totalMinorUnits += entry.amountMinorUnits
      continue
    }
    const rate = getRate(entry.currency)
    if (rate === undefined) {
      excluded[entry.currency] = (excluded[entry.currency] ?? 0) + 1
      continue
    }
    totalMinorUnits += convertMinorUnits(entry.amountMinorUnits, entry.currency, baseCurrency, rate)
    wasConverted = true
  }

  return { totalMinorUnits, wasConverted, excluded }
}
