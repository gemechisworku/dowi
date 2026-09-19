import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createNotificationsRepo, type NotificationsRepo } from '../notificationsRepo'
import type { DowiDatabase } from '../db'

describe('notificationsRepo', () => {
  let db: DowiDatabase
  let repo: NotificationsRepo

  beforeEach(() => {
    db = createTestDb()
    repo = createNotificationsRepo(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('creates a notification as unread', async () => {
    const n = await repo.create({
      type: 'task-due',
      title: 'Weekly review',
      body: 'Due today',
      scheduledFor: '2026-09-19T18:00:00.000Z',
    })
    expect(n.read).toBe(false)
    expect(n.id).toBeTruthy()
  })

  it('list() returns newest-scheduled first', async () => {
    await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.create({
      type: 'task-due',
      title: 'B',
      body: '',
      scheduledFor: '2026-09-10T08:00:00.000Z',
    })
    const list = await repo.list()
    expect(list.map((n) => n.title)).toEqual(['B', 'A'])
  })

  it('listUnread() excludes read notifications', async () => {
    const a = await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.create({
      type: 'task-due',
      title: 'B',
      body: '',
      scheduledFor: '2026-09-02T08:00:00.000Z',
    })
    await repo.markRead(a.id)

    const unread = await repo.listUnread()
    expect(unread.map((n) => n.title)).toEqual(['B'])
  })

  it('markAllRead() clears every unread notification', async () => {
    await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.create({
      type: 'task-due',
      title: 'B',
      body: '',
      scheduledFor: '2026-09-02T08:00:00.000Z',
    })
    await repo.markAllRead()
    expect(await repo.listUnread()).toHaveLength(0)
  })

  it('clear() removes a single notification permanently', async () => {
    const a = await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.clear(a.id)
    expect(await repo.list()).toHaveLength(0)
  })

  it('clearAll() empties the inbox', async () => {
    await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.create({
      type: 'task-due',
      title: 'B',
      body: '',
      scheduledFor: '2026-09-02T08:00:00.000Z',
    })
    await repo.clearAll()
    expect(await repo.list()).toHaveLength(0)
  })
})
