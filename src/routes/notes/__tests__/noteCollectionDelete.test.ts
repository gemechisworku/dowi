import { describe, expect, it } from 'vitest'
import { planCollectionDeletion } from '../noteCollectionDelete'
import type { Note } from '@/db/types'

function note(overrides: Partial<Note>): Note {
  return {
    id: overrides.id ?? 'note-1',
    title: 'Untitled',
    contentJSON: { type: 'doc', content: [] },
    contentText: '',
    tags: [],
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('planCollectionDeletion', () => {
  const notes = [
    note({ id: 'n1', collectionId: 'work' }),
    note({ id: 'n2', collectionId: 'work' }),
    note({ id: 'n3', collectionId: 'personal' }),
    note({ id: 'n4', collectionId: undefined }),
  ]

  it('"unfile" moves only the affected collection\'s notes, deletes none (the default, non-destructive choice)', () => {
    const plan = planCollectionDeletion(notes, 'work', 'unfile')
    expect(plan.toUnfile.sort()).toEqual(['n1', 'n2'])
    expect(plan.toDelete).toEqual([])
  })

  it('"delete-notes" soft-deletes only the affected collection\'s notes, moves none', () => {
    const plan = planCollectionDeletion(notes, 'work', 'delete-notes')
    expect(plan.toDelete.sort()).toEqual(['n1', 'n2'])
    expect(plan.toUnfile).toEqual([])
  })

  it('a collection with no notes produces an empty plan either way', () => {
    expect(planCollectionDeletion(notes, 'empty-collection', 'unfile')).toEqual({
      toUnfile: [],
      toDelete: [],
    })
    expect(planCollectionDeletion(notes, 'empty-collection', 'delete-notes')).toEqual({
      toUnfile: [],
      toDelete: [],
    })
  })
})
