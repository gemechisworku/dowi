import type { ExchangeRate } from '@/db/types'

/**
 * Builds a `getRate(currency)` lookup for `buildReport`/`sumConverted` — the
 * most recently observed rate on record for that currency (rates carry no
 * future-dating concept, so "latest by effectiveDate" is simply "latest
 * known"). Shared by Reports and Home so "the current rate" means the same
 * thing everywhere money gets converted to base currency.
 */
export function buildRateLookup(
  rates: readonly ExchangeRate[],
): (currency: string) => number | undefined {
  return (currency: string) => {
    const candidates = rates
      .filter((r) => r.currency === currency)
      .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))
    return candidates[0]?.rateToBase
  }
}
