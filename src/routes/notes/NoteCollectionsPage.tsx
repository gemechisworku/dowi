import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { NoteCollection } from '@/db/types'
import { planCollectionDeletion, type CollectionDeleteMode } from './noteCollectionDelete'
import { NotesSubNav } from './NotesSubNav'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

const ICON_OPTIONS = ['📁', '💡', '📔', '🎯', '🧳', '📚', '🏠', '💼', '🍳', '🎉']
const COLOR_OPTIONS = [
  { value: 'var(--color-primary)', label: 'Blue' },
  { value: 'var(--color-income)', label: 'Green' },
  { value: 'var(--color-warning)', label: 'Amber' },
  { value: 'var(--color-expense)', label: 'Red' },
  { value: 'var(--blue-700)', label: 'Dark blue' },
]

/**
 * Collections CRUD (PLAN §M5), mirroring `TaskCollectionsPage`'s shape —
 * except deletion (PRD AC-N4): rather than Tasks' single "safe delete,
 * auto-move to Unfiled" confirm, this offers an explicit choice between
 * "move notes to Unfiled" (non-destructive, the default/primary button) and
 * "delete notes too" (destructive, a secondary/danger button) — so a plain
 * `ConfirmDialog` (confirm/cancel only) doesn't fit; this uses `Dialog`
 * directly with three actions instead.
 */
export function NoteCollectionsPage() {
  const { repos } = useDatabase()
  const collections = useLiveQuery(() => repos.noteCollections.list(), [repos], EMPTY_ARRAY)
  const notes = useLiveQuery(() => repos.notes.list(), [repos], EMPTY_ARRAY)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<NoteCollection | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_OPTIONS[0]!)
  const [color, setColor] = useState(COLOR_OPTIONS[0]!.value)
  const [pendingDelete, setPendingDelete] = useState<NoteCollection | null>(null)
  const { show } = useSnackbar()

  function openCreate() {
    setEditing(null)
    setName('')
    setIcon(ICON_OPTIONS[0]!)
    setColor(COLOR_OPTIONS[0]!.value)
    setSheetOpen(true)
  }

  function openEdit(collection: NoteCollection) {
    setEditing(collection)
    setName(collection.name)
    setIcon(collection.icon ?? ICON_OPTIONS[0]!)
    setColor(collection.color)
    setSheetOpen(true)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editing) {
      await repos.noteCollections.update(editing.id, { name: trimmed, icon, color })
    } else {
      await repos.noteCollections.create({ name: trimmed, icon, color })
    }
    setSheetOpen(false)
  }

  function noteCount(collectionId: string): number {
    return notes.filter((n) => n.collectionId === collectionId).length
  }

  async function handleDelete(mode: CollectionDeleteMode) {
    if (!pendingDelete) return
    const collection = pendingDelete
    const plan = planCollectionDeletion(notes, collection.id, mode)

    await Promise.all(
      plan.toUnfile.map((id) => repos.notes.update(id, { collectionId: undefined })),
    )
    await Promise.all(plan.toDelete.map((id) => repos.notes.remove(id)))
    await repos.noteCollections.remove(collection.id)
    setPendingDelete(null)

    show({
      message:
        mode === 'unfile'
          ? `${collection.name} deleted — its notes moved to Unfiled`
          : `${collection.name} and its notes deleted`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await repos.noteCollections.restore(collection.id)
          await Promise.all(
            plan.toUnfile.map((id) => repos.notes.update(id, { collectionId: collection.id })),
          )
          await Promise.all(plan.toDelete.map((id) => repos.notes.restore(id)))
        },
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeaderBand>
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Button size="sm" onClick={openCreate} style={{ background: 'var(--color-on-brand-surface-strong)', color: 'var(--blue-700)' }}>
          Add
        </Button>
        </div>
        <NotesSubNav />
      </PageHeaderBand>

      <div className="px-4"><Card>
        {collections.length === 0 ? (
          <EmptyState icon="📁" title="No collections yet" />
        ) : (
          collections.map((collection) => (
            <ListItem
              key={collection.id}
              leading={<CategoryIcon icon={collection.icon ?? '📁'} color={collection.color} />}
              title={collection.name}
              subtitle={`${noteCount(collection.id)} note${noteCount(collection.id) === 1 ? '' : 's'}`}
              trailing={
                <div className="flex gap-1">
                  <IconButton
                    aria-label={`Edit ${collection.name}`}
                    icon="✎"
                    variant="ghost"
                    onClick={() => openEdit(collection)}
                  />
                  <IconButton
                    aria-label={`Delete ${collection.name}`}
                    icon="🗑️"
                    variant="ghost"
                    onClick={() => setPendingDelete(collection)}
                  />
                </div>
              }
            />
          ))
        )}
      </Card></div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit collection' : 'Add collection'}
      >
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            {({ inputId }) => (
              <Input
                id={inputId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          <Field label="Icon">
            {() => (
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIcon(opt)}
                    aria-pressed={icon === opt}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{
                      background: icon === opt ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Colour">
            {() => (
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-label={opt.label}
                    aria-pressed={color === opt.value}
                    onClick={() => setColor(opt.value)}
                    className="h-9 w-9 rounded-full"
                    style={{
                      background: opt.value,
                      outline:
                        color === opt.value ? '2px solid var(--color-focus-ring)' : undefined,
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            )}
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSheetOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </Sheet>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        actions={
          <div className="flex w-full flex-col gap-2">
            <Button fullWidth autoFocus onClick={() => void handleDelete('unfile')}>
              Move notes to Unfiled
            </Button>
            <Button fullWidth variant="danger" onClick={() => void handleDelete('delete-notes')}>
              Delete notes too
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
          </div>
        }
      >
        {pendingDelete && noteCount(pendingDelete.id) > 0
          ? `${noteCount(pendingDelete.id)} note${noteCount(pendingDelete.id) === 1 ? '' : 's'} in this collection. Choose what happens to them — moving to Unfiled is reversible, deleting sends them to Trash.`
          : 'This collection has no notes in it.'}
      </Dialog>
    </div>
  )
}
