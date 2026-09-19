import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { seedIfNeeded } from '../seed'
import { createRepositories } from '../repositories'
import type { DowiDatabase } from '../db'

describe('seedIfNeeded', () => {
  let db: DowiDatabase

  beforeEach(() => {
    db = createTestDb()
  })

  afterEach(async () => {
    await db.delete()
  })

  it('seeds default income and expense categories and settings on first run', async () => {
    await seedIfNeeded(db)
    const categories = await db.categories.toArray()
    expect(categories.filter((c) => c.type === 'expense').length).toBeGreaterThan(0)
    expect(categories.filter((c) => c.type === 'income').length).toBeGreaterThan(0)
    expect(await db.settings.get('settings')).toBeTruthy()
  })

  it('is idempotent — running it twice does not duplicate categories', async () => {
    await seedIfNeeded(db)
    const firstCount = (await db.categories.toArray()).length
    await seedIfNeeded(db)
    const secondCount = (await db.categories.toArray()).length
    expect(secondCount).toBe(firstCount)
  })

  it('does not recreate categories the user has deleted', async () => {
    await seedIfNeeded(db)
    const all = await db.categories.toArray()
    await db.categories.delete(all[0]!.id)
    await seedIfNeeded(db)
    expect(await db.categories.toArray()).toHaveLength(all.length - 1)
  })

  it('lists seeded categories in the intended order, not a scrambled UUID order', async () => {
    // Regression test: seeding used to give every row the same createdAt,
    // which made list()'s createdAt sort a no-op and left the *actual*
    // order up to Dexie's primary-key (UUID) iteration — effectively
    // random, and very visibly wrong for "Food, Transport, ..., Other".
    await seedIfNeeded(db)
    const repos = createRepositories(db)
    const expenseNames = (await repos.categories.list())
      .filter((c) => c.type === 'expense')
      .map((c) => c.name)
    expect(expenseNames[0]).toBe('Food')
    expect(expenseNames[expenseNames.length - 1]).toBe('Other')
  })
})
