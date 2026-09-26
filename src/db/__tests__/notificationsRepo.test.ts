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

  it('markDelivered() stamps deliveredAt', async () => {
    const a = await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    expect(a.deliveredAt).toBeUndefined()
    await repo.markDelivered(a.id)
    const [reloaded] = await repo.list()
    expect(reloaded?.deliveredAt).toBeTruthy()
  })

  it('clear() hides a notification from the inbox but keeps the row — so its occurrence still counts as already-raised', async () => {
    const a = await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.clear(a.id)
    expect(await repo.list()).toHaveLength(0)
    const all = await repo.listAllEverRaised()
    expect(all).toHaveLength(1)
    expect(all[0]?.clearedAt).toBeTruthy()
  })

  it('clearAll() empties the inbox but keeps every row', async () => {
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
    expect(await repo.listAllEverRaised()).toHaveLength(2)
  })

  it('listAllEverRaised() includes cleared notifications, unlike list()', async () => {
    const a = await repo.create({
      type: 'task-due',
      title: 'A',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    const b = await repo.create({
      type: 'task-due',
      title: 'B',
      body: '',
      scheduledFor: '2026-09-02T08:00:00.000Z',
    })
    await repo.clear(a.id)

    expect((await repo.list()).map((n) => n.id)).toEqual([b.id])
    expect((await repo.listAllEverRaised()).map((n) => n.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('prunes a cleared notification once it is old enough that it can never affect dedup again', async () => {
    const old = await repo.create({
      type: 'task-due',
      title: 'Ancient',
      body: '',
      scheduledFor: '2020-01-01T08:00:00.000Z',
    })
    // Backdate clearedAt directly — repo.clear() itself always stamps "now".
    const longAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
    await db.notifications.update(old.id, { clearedAt: longAgo })

    const recent = await repo.create({
      type: 'task-due',
      title: 'Recent',
      body: '',
      scheduledFor: '2026-09-01T08:00:00.000Z',
    })
    await repo.clear(recent.id) // any clear() call opportunistically prunes

    const all = await repo.listAllEverRaised()
    expect(all.map((n) => n.title)).toEqual(['Recent'])
  })
})
