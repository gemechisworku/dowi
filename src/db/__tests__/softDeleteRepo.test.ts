import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createRepositories, type Repositories } from '../repositories'
import type { DowiDatabase } from '../db'

// Exercised through the categories repo, but this is really testing the
// generic createSoftDeleteRepo factory shared by every list-based entity.
describe('createSoftDeleteRepo (via categories)', () => {
  let db: DowiDatabase
  let repos: Repositories

  beforeEach(() => {
    db = createTestDb()
    repos = createRepositories(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('creates a record with generated id and timestamps', async () => {
    const category = await repos.categories.create({
      name: 'Groceries',
      icon: '🛒',
      color: '#000',
      type: 'expense',
    })
    expect(category.id).toBeTruthy()
    expect(category.createdAt).toBeTruthy()
    expect(category.updatedAt).toBe(category.createdAt)
  })

  it('list() returns records in creation order, not primary-key (UUID) order', async () => {
    // Dexie's toArray() with no explicit orderBy sorts by the primary key,
    // which for a random UUID id is unrelated to insertion order — this is
    // exactly the bug this sort guards against (seed categories appearing
    // in an arbitrary, UI-visible order instead of Food/Transport/.../Other).
    // A tiny delay between creates guarantees distinct createdAt timestamps
    // (millisecond resolution) so this test isn't flaky about tie-breaking.
    const first = await repos.categories.create({
      name: 'First',
      icon: '1',
      color: '#000',
      type: 'expense',
    })
    await new Promise((r) => setTimeout(r, 2))
    const second = await repos.categories.create({
      name: 'Second',
      icon: '2',
      color: '#000',
      type: 'expense',
    })
    await new Promise((r) => setTimeout(r, 2))
    const third = await repos.categories.create({
      name: 'Third',
      icon: '3',
      color: '#000',
      type: 'expense',
    })

    const list = await repos.categories.list()
    expect(list.map((c) => c.id)).toEqual([first.id, second.id, third.id])
  })

  it('list() excludes soft-deleted records', async () => {
    const a = await repos.categories.create({
      name: 'A',
      icon: '🅰️',
      color: '#000',
      type: 'expense',
    })
    await repos.categories.create({ name: 'B', icon: '🅱️', color: '#000', type: 'expense' })
    await repos.categories.remove(a.id)

    const list = await repos.categories.list()
    expect(list.map((c) => c.name)).toEqual(['B'])
  })

  it('listTrashed() returns only soft-deleted records', async () => {
    const a = await repos.categories.create({
      name: 'A',
      icon: '🅰️',
      color: '#000',
      type: 'expense',
    })
    await repos.categories.remove(a.id)

    const trashed = await repos.categories.listTrashed()
    expect(trashed).toHaveLength(1)
    expect(trashed[0]?.id).toBe(a.id)
    expect(trashed[0]?.deletedAt).toBeTruthy()
  })

  it('restore() clears deletedAt and brings the record back into list()', async () => {
    const a = await repos.categories.create({
      name: 'A',
      icon: '🅰️',
      color: '#000',
      type: 'expense',
    })
    await repos.categories.remove(a.id)
    await repos.categories.restore(a.id)

    const list = await repos.categories.list()
    expect(list.map((c) => c.id)).toContain(a.id)
    const restored = await repos.categories.get(a.id)
    expect(restored?.deletedAt).toBeUndefined()
  })

  it('restore() preserves every other field exactly (id, given the same id back)', async () => {
    const a = await repos.categories.create({
      name: 'A',
      icon: '🅰️',
      color: '#123456',
      type: 'income',
    })
    await repos.categories.remove(a.id)
    await repos.categories.restore(a.id)
    const restored = await repos.categories.get(a.id)
    expect(restored).toMatchObject({
      id: a.id,
      name: 'A',
      icon: '🅰️',
      color: '#123456',
      type: 'income',
    })
  })

  it('update() merges the patch and bumps updatedAt', async () => {
    const a = await repos.categories.create({
      name: 'A',
      icon: '🅰️',
      color: '#000',
      type: 'expense',
    })
    const before = a.updatedAt
    await new Promise((r) => setTimeout(r, 2))
    const updated = await repos.categories.update(a.id, { name: 'A renamed' })
    expect(updated.name).toBe('A renamed')
    expect(updated.icon).toBe('🅰️') // untouched fields survive
    expect(updated.updatedAt).not.toBe(before)
  })

  it('update() throws for an id that does not exist', async () => {
    await expect(repos.categories.update('missing-id', { name: 'x' })).rejects.toThrow()
  })

  it('hardDelete() permanently removes the record, unlike remove()', async () => {
    const a = await repos.categories.create({
      name: 'A',
      icon: '🅰️',
      color: '#000',
      type: 'expense',
    })
    await repos.categories.hardDelete(a.id)
    expect(await repos.categories.get(a.id)).toBeUndefined()
    expect(await repos.categories.listTrashed()).toHaveLength(0)
  })

  it('remove() on an unknown id is a harmless no-op', async () => {
    await expect(repos.categories.remove('missing-id')).resolves.toBeUndefined()
  })
})
