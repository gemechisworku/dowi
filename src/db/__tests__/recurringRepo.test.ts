import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createRecurringRepo, type RecurringRepo } from '../recurringRepo'
import type { DowiDatabase } from '../db'
import type { RecurringCreateInput } from '../recurringRepo'

function baseInput(overrides: Partial<RecurringCreateInput> = {}): RecurringCreateInput {
  return {
    name: 'Rent',
    type: 'expense',
    amountMinorUnits: 500000,
    currency: 'ETB',
    categoryId: 'cat-1',
    tags: [],
    interval: { unit: 'month', every: 1 },
    startDate: '2026-01-31',
    autoRecord: true,
    paused: false,
    ...overrides,
  }
}

describe('createRecurringRepo', () => {
  let db: DowiDatabase
  let repo: RecurringRepo

  beforeEach(() => {
    db = createTestDb()
    repo = createRecurringRepo(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('create() sets occurrenceIndex to 0 and nextDueDate to startDate', async () => {
    const template = await repo.create(baseInput())
    expect(template.id).toBeTruthy()
    expect(template.occurrenceIndex).toBe(0)
    expect(template.nextDueDate).toBe('2026-01-31')
    expect(template.lastGeneratedDate).toBeUndefined()
    expect(template.createdAt).toBeTruthy()
    expect(template.updatedAt).toBe(template.createdAt)
  })

  it('list() returns created templates, excluding soft-deleted ones', async () => {
    const a = await repo.create(baseInput({ name: 'Rent' }))
    const b = await repo.create(baseInput({ name: 'Netflix' }))
    await repo.remove(a.id)

    const list = await repo.list()
    expect(list.map((t) => t.id)).toEqual([b.id])
  })

  it('get() returns a single template by id', async () => {
    const created = await repo.create(baseInput())
    const found = await repo.get(created.id)
    expect(found).toMatchObject({ id: created.id, name: 'Rent' })
  })

  it('update() merges a patch and bumps updatedAt', async () => {
    const created = await repo.create(baseInput())
    const before = created.updatedAt
    await new Promise((r) => setTimeout(r, 2))
    const updated = await repo.update(created.id, { name: 'Rent (updated)', autoRecord: false })
    expect(updated.name).toBe('Rent (updated)')
    expect(updated.autoRecord).toBe(false)
    expect(updated.amountMinorUnits).toBe(500000) // untouched fields survive
    expect(updated.updatedAt).not.toBe(before)
  })

  it('remove()/restore() soft-deletes and brings a template back', async () => {
    const created = await repo.create(baseInput())
    await repo.remove(created.id)
    expect(await repo.list()).toHaveLength(0)
    expect((await repo.listTrashed()).map((t) => t.id)).toEqual([created.id])

    await repo.restore(created.id)
    expect(await repo.list()).toHaveLength(1)
    expect((await repo.get(created.id))?.deletedAt).toBeUndefined()
  })

  it('hardDelete() permanently removes the record', async () => {
    const created = await repo.create(baseInput())
    await repo.hardDelete(created.id)
    expect(await repo.get(created.id)).toBeUndefined()
  })

  describe('confirmOccurrence', () => {
    it('advances occurrenceIndex, recomputes nextDueDate, and records lastGeneratedDate', async () => {
      const created = await repo.create(
        baseInput({ startDate: '2026-01-31', interval: { unit: 'month', every: 1 } }),
      )
      await repo.confirmOccurrence(created.id, '2026-01-31')

      const updated = await repo.get(created.id)
      expect(updated?.occurrenceIndex).toBe(1)
      // Feb has no 31st, so the cached nextDueDate should reflect the
      // clamped occurrence — same math as occurrenceAt().
      expect(updated?.nextDueDate).toBe('2026-02-28')
      expect(updated?.lastGeneratedDate).toBe('2026-01-31')
    })

    it('advances correctly across repeated confirmations', async () => {
      const created = await repo.create(
        baseInput({ startDate: '2026-01-15', interval: { unit: 'week', every: 1 } }),
      )
      await repo.confirmOccurrence(created.id, '2026-01-15')
      await repo.confirmOccurrence(created.id, '2026-01-22')

      const updated = await repo.get(created.id)
      expect(updated?.occurrenceIndex).toBe(2)
      expect(updated?.nextDueDate).toBe('2026-01-29')
      expect(updated?.lastGeneratedDate).toBe('2026-01-22')
    })

    it('is a harmless no-op for an unknown id', async () => {
      await expect(repo.confirmOccurrence('missing-id', '2026-01-01')).resolves.toBeUndefined()
    })
  })
})
