import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createActivityLogRepo, type ActivityLogRepo } from '../activityLogRepo'
import type { DowiDatabase } from '../db'

describe('activityLogRepo', () => {
  let db: DowiDatabase
  let repo: ActivityLogRepo

  beforeEach(() => {
    db = createTestDb()
    repo = createActivityLogRepo(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('creates a new day entry with count 1 on the first record', async () => {
    await repo.record('2026-06-01')
    const [entry] = await repo.list()
    expect(entry).toEqual({ date: '2026-06-01', count: 1 })
  })

  it('increments the same day rather than creating a second row', async () => {
    await repo.record('2026-06-01')
    await repo.record('2026-06-01')
    await repo.record('2026-06-01')
    const all = await repo.list()
    expect(all).toHaveLength(1)
    expect(all[0]?.count).toBe(3)
  })

  it('keeps separate counts per day', async () => {
    await repo.record('2026-06-01')
    await repo.record('2026-06-01')
    await repo.record('2026-06-02')

    const all = await repo.list()
    const byDate = new Map(all.map((e) => [e.date, e.count]))
    expect(byDate.get('2026-06-01')).toBe(2)
    expect(byDate.get('2026-06-02')).toBe(1)
  })
})
