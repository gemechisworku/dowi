import type { Note, NoteCollection } from '@/db/types'
import { getMonthRange, getWeekRange, shiftPeriod } from '@/lib/period'

export type DateGroupKey = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'earlier'

const DATE_GROUP_ORDER: DateGroupKey[] = [
  'today',
  'yesterday',
  'this-week',
  'this-month',
  'earlier',
]
const DATE_GROUP_LABEL: Record<DateGroupKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  'this-month': 'This month',
  earlier: 'Earlier',
}

export interface NoteGroup {
  key: string
  label: string
  notes: Note[]
}

/**
 * The local calendar date part of `updatedAt`. Grouping is by *calendar
 * day*, not a rolling 24h window — a note edited at 23:59 and one edited a
 * minute later at 00:01 must land in different groups even though they're
 * two minutes apart (TESTING §M5's explicit boundary case).
 */
function localDateOf(isoDateTime: string): string {
  return isoDateTime.slice(0, 10)
}

/**
 * Which of the five PRD groups a date falls into, relative to `today`
 * ("YYYY-MM-DD"). "This week" uses a Monday-start calendar week — the same
 * convention `week.ts` already established for task planning — rather than
 * a rolling 7-day window, so the boundary is the same one a person's own
 * calendar app would show them.
 */
export function dateGroupFor(date: string, today: string): DateGroupKey {
  if (date === today) return 'today'
  const yesterday = shiftPeriod('day', today, -1)
  if (date === yesterday) return 'yesterday'
  const week = getWeekRange(today, 1)
  if (date >= week.start && date <= week.end) return 'this-week'
  const month = getMonthRange(today)
  if (date >= month.start && date <= month.end) return 'this-month'
  return 'earlier'
}

function byUpdatedAtDesc(a: Note, b: Note): number {
  return b.updatedAt < a.updatedAt ? -1 : b.updatedAt > a.updatedAt ? 1 : 0
}

/**
 * Pulls every pinned note out of wherever it naturally falls and reinserts
 * the set (most recently updated first) at the top of the very first group
 * — "pinned notes always float to the top of the first group" (PRD §5.5),
 * not a separate "Pinned" section of their own. Groups left empty by the
 * removal are dropped; a group that only contains pinned notes because it
 * would otherwise have been empty is kept.
 */
function floatPinnedToTop(groups: NoteGroup[]): NoteGroup[] {
  if (groups.length === 0) return groups
  const pinned: Note[] = []
  const withoutPinned = groups.map((g) => ({
    ...g,
    notes: g.notes.filter((n) => {
      if (n.pinned) {
        pinned.push(n)
        return false
      }
      return true
    }),
  }))
  if (pinned.length === 0) return withoutPinned.filter((g) => g.notes.length > 0)
  pinned.sort(byUpdatedAtDesc)

  const [first, ...rest] = withoutPinned
  const merged: NoteGroup[] = [{ ...first!, notes: [...pinned, ...first!.notes] }, ...rest]
  return merged.filter((g) => g.notes.length > 0)
}

/** Groups notes into Today / Yesterday / This week / This month / Earlier, pinned notes floated to the top. */
export function groupNotesByDate(notes: readonly Note[], today: string): NoteGroup[] {
  const buckets = new Map<DateGroupKey, Note[]>()
  for (const note of notes) {
    const key = dateGroupFor(localDateOf(note.updatedAt), today)
    const list = buckets.get(key) ?? []
    list.push(note)
    buckets.set(key, list)
  }
  for (const list of buckets.values()) list.sort(byUpdatedAtDesc)

  const groups = DATE_GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: DATE_GROUP_LABEL[key],
    notes: buckets.get(key)!,
  }))
  return floatPinnedToTop(groups)
}

const UNFILED_KEY = '__unfiled__'

/** Groups notes by collection (in the collections' own list order, "Unfiled" last), pinned notes floated to the top. */
export function groupNotesByCollection(
  notes: readonly Note[],
  collections: readonly NoteCollection[],
): NoteGroup[] {
  const buckets = new Map<string, Note[]>()
  for (const note of notes) {
    const key = note.collectionId ?? UNFILED_KEY
    const list = buckets.get(key) ?? []
    list.push(note)
    buckets.set(key, list)
  }
  for (const list of buckets.values()) list.sort(byUpdatedAtDesc)

  const groups: NoteGroup[] = []
  for (const collection of collections) {
    if (buckets.has(collection.id)) {
      groups.push({
        key: collection.id,
        label: collection.name,
        notes: buckets.get(collection.id)!,
      })
    }
  }
  if (buckets.has(UNFILED_KEY)) {
    groups.push({ key: UNFILED_KEY, label: 'Unfiled', notes: buckets.get(UNFILED_KEY)! })
  }
  return floatPinnedToTop(groups)
}

/** Case-insensitive substring match over title + the derived plain-text body (PRD AC-N5 — body-only matches must hit). */
export function filterNotesBySearch(notes: readonly Note[], search: string): Note[] {
  const trimmed = search.trim().toLowerCase()
  if (!trimmed) return [...notes]
  return notes.filter(
    (n) => n.title.toLowerCase().includes(trimmed) || n.contentText.toLowerCase().includes(trimmed),
  )
}
