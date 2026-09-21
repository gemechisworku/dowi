import type { Note } from '@/db/types'

export type CollectionDeleteMode = 'unfile' | 'delete-notes'

export interface CollectionDeletePlan {
  /** Note ids to set collectionId = undefined on ("move to Unfiled"). */
  toUnfile: string[]
  /** Note ids to soft-delete alongside the collection ("delete notes too"). */
  toDelete: string[]
}

/**
 * What happens to a collection's notes when it's deleted (PRD AC-N4): the
 * default, non-destructive choice moves them to Unfiled; the explicit,
 * destructive choice soft-deletes them too (into Trash, same as deleting
 * them individually — not a hard delete). Pure so the two branches are
 * unit-testable without a database (see noteCollectionDelete.test.ts); the
 * route wires the result into `repos.notes.update`/`remove` calls.
 */
export function planCollectionDeletion(
  notes: readonly Note[],
  collectionId: string,
  mode: CollectionDeleteMode,
): CollectionDeletePlan {
  const affected = notes.filter((n) => n.collectionId === collectionId).map((n) => n.id)
  return mode === 'unfile'
    ? { toUnfile: affected, toDelete: [] }
    : { toUnfile: [], toDelete: affected }
}
