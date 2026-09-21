import { describe, expect, it } from 'vitest'
import { idsToPurge, sweepExpiredNoteTrash, TRASH_RETENTION_DAYS } from '../notesTrashSweep'
import { createRepositories } from '../repositories'
import { createTestDb } from './testDb'

const NOW = new Date('2026-09-21T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString()
}

describe('idsToPurge', () => {
  it('purges rows deleted more than 30 days ago', () => {
    const rows = [{ id: 'old', deletedAt: daysAgo(TRASH_RETENTION_DAYS + 1) }]
    expect(idsToPurge(rows, NOW)).toEqual(['old'])
  })

  it('keeps rows deleted fewer than 30 days ago', () => {
    const rows = [{ id: 'recent', deletedAt: daysAgo(TRASH_RETENTION_DAYS - 1) }]
    expect(idsToPurge(rows, NOW)).toEqual([])
  })

  it('keeps a row exactly at the 30-day boundary (not yet expired)', () => {
    const rows = [{ id: 'boundary', deletedAt: daysAgo(TRASH_RETENTION_DAYS) }]
    expect(idsToPurge(rows, NOW)).toEqual([])
  })

  it('ignores rows with no deletedAt', () => {
    const rows = [{ id: 'not-trashed' }]
    expect(idsToPurge(rows, NOW)).toEqual([])
  })

  it('handles a mix, purging only the expired ones', () => {
    const rows = [
      { id: 'expired-1', deletedAt: daysAgo(45) },
      { id: 'kept', deletedAt: daysAgo(5) },
      { id: 'expired-2', deletedAt: daysAgo(31) },
    ]
    expect(idsToPurge(rows, NOW).sort()).toEqual(['expired-1', 'expired-2'])
  })
})

describe('sweepExpiredNoteTrash', () => {
  it('hard-deletes expired trashed notes and leaves recent ones restorable', async () => {
    const db = createTestDb()
    const repos = createRepositories(db)

    const expired = await repos.notes.create({
      title: 'Old deleted note',
      contentJSON: { type: 'doc', content: [] },
      contentText: '',
      tags: [],
      pinned: false,
    })
    const recent = await repos.notes.create({
      title: 'Recently deleted note',
      contentJSON: { type: 'doc', content: [] },
      contentText: '',
      tags: [],
      pinned: false,
    })
    const kept = await repos.notes.create({
      title: 'Still active note',
      contentJSON: { type: 'doc', content: [] },
      contentText: '',
      tags: [],
      pinned: false,
    })

    await repos.notes.remove(expired.id)
    await repos.notes.remove(recent.id)
    // Back-date the "expired" note's deletedAt past the retention window —
    // remove() always stamps "now", so this simulates 45 days of elapsed time.
    await db.notes.update(expired.id, { deletedAt: daysAgo(45) })

    await sweepExpiredNoteTrash(repos.notes, NOW)

    expect(await repos.notes.get(expired.id)).toBeUndefined()
    expect(await repos.notes.get(recent.id)).toBeDefined()
    expect(await repos.notes.get(kept.id)).toBeDefined()

    const trashed = await repos.notes.listTrashed()
    expect(trashed.map((n) => n.id)).toEqual([recent.id])
  })
})
