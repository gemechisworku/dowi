import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createRepositories, type Repositories } from '../repositories'
import type { DowiDatabase } from '../db'

describe('rates repository', () => {
  let db: DowiDatabase
  let repos: Repositories

  beforeEach(() => {
    db = createTestDb()
    repos = createRepositories(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('returns undefined when no rate exists for a currency', async () => {
    expect(await repos.rates.getRateForCurrency('USD')).toBeUndefined()
  })

  it('returns the only rate when there is exactly one', async () => {
    await repos.rates.create({ currency: 'USD', rateToBase: 140, effectiveDate: '2026-01-01' })
    const rate = await repos.rates.getRateForCurrency('USD')
    expect(rate?.rateToBase).toBe(140)
  })

  it('returns the most recent rate when several exist', async () => {
    await repos.rates.create({ currency: 'USD', rateToBase: 130, effectiveDate: '2026-01-01' })
    await repos.rates.create({ currency: 'USD', rateToBase: 145, effectiveDate: '2026-06-01' })
    await repos.rates.create({ currency: 'USD', rateToBase: 140, effectiveDate: '2026-03-01' })

    const rate = await repos.rates.getRateForCurrency('USD')
    expect(rate?.rateToBase).toBe(145)
  })

  it('respects an "as of" date, ignoring rates set after it', async () => {
    await repos.rates.create({ currency: 'USD', rateToBase: 130, effectiveDate: '2026-01-01' })
    await repos.rates.create({ currency: 'USD', rateToBase: 145, effectiveDate: '2026-06-01' })

    const rate = await repos.rates.getRateForCurrency('USD', '2026-03-01')
    expect(rate?.rateToBase).toBe(130)
  })

  it('keeps rates for different currencies independent', async () => {
    await repos.rates.create({ currency: 'USD', rateToBase: 140, effectiveDate: '2026-01-01' })
    await repos.rates.create({ currency: 'GBP', rateToBase: 175, effectiveDate: '2026-01-01' })

    expect((await repos.rates.getRateForCurrency('USD'))?.rateToBase).toBe(140)
    expect((await repos.rates.getRateForCurrency('GBP'))?.rateToBase).toBe(175)
  })

  it('ignores a soft-deleted rate', async () => {
    const rate = await repos.rates.create({
      currency: 'USD',
      rateToBase: 140,
      effectiveDate: '2026-01-01',
    })
    await repos.rates.remove(rate.id)
    expect(await repos.rates.getRateForCurrency('USD')).toBeUndefined()
  })
})
