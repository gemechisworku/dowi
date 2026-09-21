import type { Repositories } from './repositories'

/** How long a soft-deleted note sits in Trash before being purged for good (PRD §5.5). */
export const TRASH_RETENTION_DAYS = 30

export interface TrashedRow {
  id: string
  deletedAt?: string
}

/**
 * Pure decision function: which trashed rows are older than the retention
 * window as of `now`. Kept separate from the actual `hardDelete` calls so
 * the boundary math is unit-testable with plain fixtures (see
 * notesTrashSweep.test.ts) — it doesn't need a database to be exercised.
 */
export function idsToPurge(rows: readonly TrashedRow[], now: Date): string[] {
  const cutoff = now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  return rows
    .filter((row) => row.deletedAt !== undefined && new Date(row.deletedAt).getTime() < cutoff)
    .map((row) => row.id)
}

/**
 * Sweeps expired notes out of Trash for good. There's no background job
 * runner other than the M7 service worker's periodicsync (which can't
 * touch IndexedDB reliably across every target browser), so this runs
 * once per app open instead — called from `DatabaseProvider` right after
 * `seedIfNeeded`, the existing "once per app open" hook point.
 */
export async function sweepExpiredNoteTrash(
  notes: Repositories['notes'],
  now: Date = new Date(),
): Promise<void> {
  const trashed = await notes.listTrashed()
  const expired = idsToPurge(trashed, now)
  await Promise.all(expired.map((id) => notes.hardDelete(id)))
}
