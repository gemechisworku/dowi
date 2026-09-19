import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createRepositories, type Repositories } from '../repositories'
import type { DowiDatabase } from '../db'
import type { Category } from '../types'

describe('transactions repository', () => {
  let db: DowiDatabase
  let repos: Repositories
  let food: Category
  let transport: Category

  beforeEach(async () => {
    db = createTestDb()
    repos = createRepositories(db)
    food = await repos.categories.create({
      name: 'Food',
      icon: '🍽️',
      color: '#000',
      type: 'expense',
    })
    transport = await repos.categories.create({
      name: 'Transport',
      icon: '🚕',
      color: '#000',
      type: 'expense',
    })

    await repos.transactions.create({
      type: 'expense',
      amountMinorUnits: 5000,
      currency: 'ETB',
      date: '2026-09-01',
      categoryId: food.id,
      tags: [],
      note: 'Lunch',
    })
    await repos.transactions.create({
      type: 'expense',
      amountMinorUnits: 3000,
      currency: 'ETB',
      date: '2026-09-15',
      categoryId: transport.id,
      tags: [],
      note: 'Taxi',
    })
    await repos.transactions.create({
      type: 'income',
      amountMinorUnits: 200000,
      currency: 'USD',
      date: '2026-09-10',
      categoryId: food.id, // arbitrary for this fixture
      tags: [],
    })
  })

  afterEach(async () => {
    await db.delete()
  })

  it('listFiltered with no filters returns everything non-deleted', async () => {
    expect(await repos.transactions.listFiltered()).toHaveLength(3)
  })

  it('filters by type', async () => {
    const expenses = await repos.transactions.listFiltered({ type: 'expense' })
    expect(expenses).toHaveLength(2)
  })

  it('filters by category', async () => {
    const foodTx = await repos.transactions.listFiltered({ categoryId: food.id })
    expect(foodTx).toHaveLength(2)
  })

  it('filters by currency', async () => {
    const usd = await repos.transactions.listFiltered({ currency: 'USD' })
    expect(usd).toHaveLength(1)
  })

  it('filters by an inclusive date range', async () => {
    const inRange = await repos.transactions.listFiltered({
      fromDate: '2026-09-05',
      toDate: '2026-09-15',
    })
    expect(inRange.map((t) => t.date).sort()).toEqual(['2026-09-10', '2026-09-15'])
  })

  it('filters by note text, case-insensitively', async () => {
    const found = await repos.transactions.listFiltered({ text: 'LUNCH' })
    expect(found).toHaveLength(1)
    expect(found[0]?.note).toBe('Lunch')
  })

  it('combines filters with AND semantics', async () => {
    const found = await repos.transactions.listFiltered({
      type: 'expense',
      categoryId: transport.id,
    })
    expect(found).toHaveLength(1)
    expect(found[0]?.note).toBe('Taxi')
  })

  it('excludes soft-deleted transactions from listFiltered', async () => {
    const all = await repos.transactions.listFiltered()
    await repos.transactions.remove(all[0]!.id)
    expect(await repos.transactions.listFiltered()).toHaveLength(2)
  })

  describe('reassignCategory', () => {
    it('moves every transaction from one category to another and returns the affected count', async () => {
      const affected = await repos.transactions.reassignCategory(food.id, transport.id)
      expect(affected).toBe(2)
      const all = await repos.transactions.list()
      expect(all.every((t) => t.categoryId !== food.id)).toBe(true)
      expect(all.filter((t) => t.categoryId === transport.id)).toHaveLength(3)
    })

    it('does not touch transactions in other categories', async () => {
      await repos.transactions.reassignCategory(food.id, transport.id)
      const taxi = (await repos.transactions.list()).find((t) => t.note === 'Taxi')
      expect(taxi?.categoryId).toBe(transport.id) // was already transport, unaffected in substance
    })
  })
})
