import { describe, expect, it } from 'vitest'
import {
  dateGroupFor,
  filterNotesBySearch,
  groupNotesByCollection,
  groupNotesByDate,
} from '../noteViews'
import type { Note, NoteCollection } from '@/db/types'

// A Monday, to keep the "this week" boundary unambiguous (getWeekRange uses
// a Monday-start week here — see noteViews.ts).
const TODAY = '2026-09-21'

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

describe('dateGroupFor', () => {
  it('buckets today and yesterday', () => {
    expect(dateGroupFor('2026-09-21', TODAY)).toBe('today')
    expect(dateGroupFor('2026-09-20', TODAY)).toBe('yesterday')
  })

  it('buckets the rest of the current Monday-start week as "this-week"', () => {
    // 2026-09-21 is a Monday; the week runs through Sunday 2026-09-27.
    expect(dateGroupFor('2026-09-22', TODAY)).toBe('this-week')
    expect(dateGroupFor('2026-09-27', TODAY)).toBe('this-week')
  })

  it('buckets the rest of the current month as "this-month"', () => {
    expect(dateGroupFor('2026-09-05', TODAY)).toBe('this-month')
    expect(dateGroupFor('2026-09-30', TODAY)).toBe('this-month')
  })

  it('buckets anything before the current month as "earlier"', () => {
    expect(dateGroupFor('2026-08-31', TODAY)).toBe('earlier')
    expect(dateGroupFor('2025-01-01', TODAY)).toBe('earlier')
  })
})

describe('groupNotesByDate', () => {
  it('puts a note edited yesterday in the Yesterday group', () => {
    const n = note({ id: 'n1', updatedAt: '2026-09-20T10:00:00.000Z' })
    const groups = groupNotesByDate([n], TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.label).toBe('Yesterday')
    expect(groups[0]!.notes).toEqual([n])
  })

  it('the 23:59 / 00:01 boundary lands notes in different groups', () => {
    // "Today" here is the 21st; a note updated at 23:59 on the 20th is
    // "Yesterday", one updated two minutes later at 00:01 on the 21st is
    // "Today" — a calendar-day boundary, not a rolling-24h one.
    const lateYesterday = note({ id: 'late', updatedAt: '2026-09-20T23:59:00.000Z' })
    const earlyToday = note({ id: 'early', updatedAt: '2026-09-21T00:01:00.000Z' })
    const groups = groupNotesByDate([lateYesterday, earlyToday], TODAY)

    const byLabel = new Map(groups.map((g) => [g.label, g.notes.map((n) => n.id)]))
    expect(byLabel.get('Yesterday')).toEqual(['late'])
    expect(byLabel.get('Today')).toEqual(['early'])
  })

  it('orders groups Today, Yesterday, This week, This month, Earlier and drops empty ones', () => {
    const notes = [
      note({ id: 'earlier', updatedAt: '2026-01-01T00:00:00.000Z' }),
      note({ id: 'today', updatedAt: '2026-09-21T09:00:00.000Z' }),
      note({ id: 'this-month', updatedAt: '2026-09-10T09:00:00.000Z' }),
    ]
    const groups = groupNotesByDate(notes, TODAY)
    expect(groups.map((g) => g.label)).toEqual(['Today', 'This month', 'Earlier'])
  })

  it('sorts notes within a group by updatedAt descending', () => {
    const older = note({ id: 'older', updatedAt: '2026-09-21T08:00:00.000Z' })
    const newer = note({ id: 'newer', updatedAt: '2026-09-21T09:00:00.000Z' })
    const groups = groupNotesByDate([older, newer], TODAY)
    expect(groups[0]!.notes.map((n) => n.id)).toEqual(['newer', 'older'])
  })

  it('floats pinned notes to the top of the first group regardless of their own date', () => {
    const pinnedOld = note({
      id: 'pinned-old',
      pinned: true,
      updatedAt: '2025-01-01T00:00:00.000Z',
    })
    const today1 = note({ id: 'today-1', updatedAt: '2026-09-21T08:00:00.000Z' })
    const today2 = note({ id: 'today-2', updatedAt: '2026-09-21T09:00:00.000Z' })

    const groups = groupNotesByDate([today1, pinnedOld, today2], TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.label).toBe('Today')
    expect(groups[0]!.notes.map((n) => n.id)).toEqual(['pinned-old', 'today-2', 'today-1'])
  })

  it('when every note is pinned, still produces exactly one group', () => {
    const a = note({ id: 'a', pinned: true, updatedAt: '2026-09-21T08:00:00.000Z' })
    const b = note({ id: 'b', pinned: true, updatedAt: '2026-08-01T08:00:00.000Z' })
    const groups = groupNotesByDate([a, b], TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.notes.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('returns no groups for an empty note list', () => {
    expect(groupNotesByDate([], TODAY)).toEqual([])
  })
})

describe('groupNotesByCollection', () => {
  const work: NoteCollection = {
    id: 'work',
    name: 'Work',
    color: 'blue',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const personal: NoteCollection = {
    id: 'personal',
    name: 'Personal',
    color: 'green',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }

  it('groups by collection, in collection list order, with Unfiled last', () => {
    const notes = [
      note({ id: 'n1', collectionId: 'personal' }),
      note({ id: 'n2', collectionId: undefined }),
      note({ id: 'n3', collectionId: 'work' }),
    ]
    const groups = groupNotesByCollection(notes, [work, personal])
    expect(groups.map((g) => g.label)).toEqual(['Work', 'Personal', 'Unfiled'])
  })

  it('omits a collection with no notes in it', () => {
    const notes = [note({ id: 'n1', collectionId: 'work' })]
    const groups = groupNotesByCollection(notes, [work, personal])
    expect(groups.map((g) => g.label)).toEqual(['Work'])
  })

  it('floats pinned notes to the top of the first collection group', () => {
    const notes = [
      note({ id: 'n1', collectionId: 'work', updatedAt: '2026-09-01T00:00:00.000Z' }),
      note({
        id: 'n2',
        collectionId: 'personal',
        pinned: true,
        updatedAt: '2026-09-02T00:00:00.000Z',
      }),
    ]
    const groups = groupNotesByCollection(notes, [work, personal])
    expect(groups[0]!.label).toBe('Work')
    expect(groups[0]!.notes.map((n) => n.id)).toEqual(['n2', 'n1'])
  })
})

describe('filterNotesBySearch', () => {
  const titleMatch = note({ id: 'title', title: 'Grocery list', contentText: 'milk eggs bread' })
  const bodyMatch = note({
    id: 'body',
    title: 'Untitled',
    contentText: 'remember to call the plumber tomorrow',
  })
  const noMatch = note({ id: 'none', title: 'Book club', contentText: 'discuss chapter three' })

  it('matches on title', () => {
    expect(
      filterNotesBySearch([titleMatch, bodyMatch, noMatch], 'grocery').map((n) => n.id),
    ).toEqual(['title'])
  })

  it('matches inside the body only, not just the title (AC-N5)', () => {
    expect(
      filterNotesBySearch([titleMatch, bodyMatch, noMatch], 'plumber').map((n) => n.id),
    ).toEqual(['body'])
  })

  it('is case-insensitive', () => {
    expect(filterNotesBySearch([titleMatch], 'GROCERY')).toHaveLength(1)
  })

  it('returns every note for an empty/whitespace search', () => {
    expect(filterNotesBySearch([titleMatch, bodyMatch, noMatch], '   ')).toHaveLength(3)
  })

  it('returns nothing when nothing matches', () => {
    expect(filterNotesBySearch([titleMatch, bodyMatch, noMatch], 'xyz')).toEqual([])
  })
})
