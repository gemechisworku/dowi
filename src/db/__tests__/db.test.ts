import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../db'

/**
 * Exercises the real Dexie upgrade path — unlike every other test's fresh
 * `createTestDb()` (which opens a brand-new, already-current-version
 * database and never runs any `.upgrade()` callback at all), this
 * deliberately builds a database still at version 2 first, then opens it
 * with the current (version 3) schema, the same way a real user's existing
 * IndexedDB would encounter this migration on their next visit.
 */
describe('DowiDatabase version 3 migration — subtasks become child Task rows', () => {
  let dbName: string | undefined

  afterEach(async () => {
    if (dbName) await Dexie.delete(dbName)
  })

  it("splits an existing task's embedded subtasks into standalone parentTaskId rows, stripping the field from the parent", async () => {
    dbName = `dowi-migration-test-${Date.now()}-${Math.random().toString(36).slice(2)}`

    const old = new Dexie(dbName)
    old.version(1).stores({
      transactions: '&id, date, type, categoryId, [type+date], currency, deletedAt',
      categories: '&id, type, deletedAt',
      sources: '&id, deletedAt',
      accounts: '&id, deletedAt',
      rates: '&id, currency, effectiveDate',
      notes: '&id, collectionId, updatedAt, pinned, deletedAt',
      noteCollections: '&id, deletedAt',
      tasks: '&id, collectionId, dueAt, status, weekKey, deletedAt',
      taskCollections: '&id, deletedAt',
      notifications: '&id, scheduledFor, read',
      settings: '&id',
      meta: '&key',
    })
    old.version(2).stores({
      transactions: '&id, date, type, categoryId, [type+date], currency, deletedAt, recurringId',
      recurringTransactions: '&id, nextDueDate, deletedAt, paused',
    })
    await old.open()
    await old.table('tasks').add({
      id: 'parent-1',
      title: 'Plan the trip',
      subtasks: [
        { id: 'sub-1', title: 'Book flights', done: true },
        { id: 'sub-2', title: 'Book hotel', done: false },
      ],
      priority: 'none',
      status: 'todo',
      reminderOffsets: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    // A task with no subtasks at all — the common case — must survive the
    // upgrade untouched (no phantom child rows, no crash on a missing field).
    await old.table('tasks').add({
      id: 'parent-2',
      title: 'Solo task',
      priority: 'none',
      status: 'todo',
      reminderOffsets: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    old.close()

    const db = createDatabase(dbName)
    await db.open()

    const allTasks = await db.tasks.toArray()
    expect(allTasks).toHaveLength(4)

    const parent1 = allTasks.find((t) => t.id === 'parent-1')
    expect(parent1).not.toHaveProperty('subtasks')

    const parent2 = allTasks.find((t) => t.id === 'parent-2')
    expect(parent2).not.toHaveProperty('subtasks')

    const children = allTasks.filter((t) => t.parentTaskId === 'parent-1')
    expect(children).toHaveLength(2)

    const flights = children.find((c) => c.id === 'sub-1')
    expect(flights).toMatchObject({
      title: 'Book flights',
      status: 'done',
      parentTaskId: 'parent-1',
      priority: 'none',
    })
    expect(typeof flights?.completedAt).toBe('string')

    const hotel = children.find((c) => c.id === 'sub-2')
    expect(hotel).toMatchObject({
      title: 'Book hotel',
      status: 'todo',
      parentTaskId: 'parent-1',
    })
    expect(hotel?.completedAt).toBeUndefined()

    // Querying by the new index actually works, not just a linear scan.
    await expect(db.tasks.where({ parentTaskId: 'parent-1' }).toArray()).resolves.toHaveLength(2)

    await db.close()
  })
})
