import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { Note } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { NotesSubNav } from './NotesSubNav'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

const DELETED_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })

/**
 * The Trash view for soft-deleted notes (PRD §5.5): restore, or permanently
 * delete right away. Anything left here ages out on its own too — expired
 * rows are swept and hard-deleted once per app open, from
 * `DatabaseProvider` via `sweepExpiredNoteTrash` (src/db/notesTrashSweep.ts)
 * — there's no separate "purge now" button because there's nothing left for
 * one to do between app opens.
 */
export function NoteTrashPage() {
  const { repos } = useDatabase()
  const trashed = useLiveQuery(() => repos.notes.listTrashed(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()
  const [pendingPurge, setPendingPurge] = useState<Note | null>(null)

  async function handleRestore(note: Note) {
    await repos.notes.restore(note.id)
    show({ message: `"${note.title || 'Untitled'}" restored` })
  }

  async function handlePurge() {
    if (!pendingPurge) return
    await repos.notes.hardDelete(pendingPurge.id)
    setPendingPurge(null)
    show({ message: 'Note permanently deleted' })
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeaderBand>
        <h1 className="text-2xl font-bold">Trash</h1>
        <NotesSubNav />
      </PageHeaderBand>

      <div className="px-4">
      {trashed.length === 0 ? (
        <EmptyState icon="🗑️" title="Trash is empty" />
      ) : (
        <Card>
          {trashed.map((note) => (
            <ListItem
              key={note.id}
              title={note.title || 'Untitled'}
              subtitle={
                note.deletedAt
                  ? `Deleted ${DELETED_FORMATTER.format(new Date(note.deletedAt))}`
                  : undefined
              }
              trailing={
                <div className="flex gap-1">
                  <IconButton
                    aria-label={`Restore "${note.title || 'Untitled'}"`}
                    icon="↩︎"
                    variant="ghost"
                    onClick={() => void handleRestore(note)}
                  />
                  <IconButton
                    aria-label={`Permanently delete "${note.title || 'Untitled'}"`}
                    icon="🗑️"
                    variant="ghost"
                    onClick={() => setPendingPurge(note)}
                  />
                </div>
              }
            />
          ))}
        </Card>
      )}
      </div>

      <ConfirmDialog
        open={pendingPurge !== null}
        title="Delete forever?"
        description="This note will be gone for good — it can't be restored."
        confirmLabel="Delete forever"
        danger
        onCancel={() => setPendingPurge(null)}
        onConfirm={() => void handlePurge()}
      />
    </div>
  )
}
