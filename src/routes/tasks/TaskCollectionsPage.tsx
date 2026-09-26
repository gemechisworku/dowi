import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { TaskCollection } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { TasksSubNav } from './TasksSubNav'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

const ICON_OPTIONS = ['📁', '🏠', '💼', '🎯', '🏃', '📚', '🛒', '✈️', '👨‍👩‍👧', '🎉']
const COLOR_OPTIONS = [
  { value: 'var(--color-primary)', label: 'Blue' },
  { value: 'var(--color-income)', label: 'Green' },
  { value: 'var(--color-warning)', label: 'Amber' },
  { value: 'var(--color-expense)', label: 'Red' },
  { value: 'var(--blue-700)', label: 'Dark blue' },
]

/**
 * Collections CRUD (PRD/PLAN §M6). Deleting a collection in use moves its
 * tasks to Unfiled rather than requiring a replacement first — unlike
 * Money's categories (PRD explicitly requires reassignment there), this
 * follows the same "safe delete, move to Unfiled" shape M5 specifies for
 * note collections, which is the friendlier default absent a reason not to.
 */
export function TaskCollectionsPage() {
  const { repos } = useDatabase()
  const collections = useLiveQuery(() => repos.taskCollections.list(), [repos], EMPTY_ARRAY)
  const tasks = useLiveQuery(() => repos.tasks.list(), [repos], EMPTY_ARRAY)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<TaskCollection | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_OPTIONS[0]!)
  const [color, setColor] = useState(COLOR_OPTIONS[0]!.value)
  const [pendingDelete, setPendingDelete] = useState<TaskCollection | null>(null)
  const { show } = useSnackbar()

  function openCreate() {
    setEditing(null)
    setName('')
    setIcon(ICON_OPTIONS[0]!)
    setColor(COLOR_OPTIONS[0]!.value)
    setSheetOpen(true)
  }

  function openEdit(collection: TaskCollection) {
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
      await repos.taskCollections.update(editing.id, { name: trimmed, icon, color })
    } else {
      await repos.taskCollections.create({ name: trimmed, icon, color })
    }
    setSheetOpen(false)
  }

  function taskCount(collectionId: string): number {
    return tasks.filter((t) => t.collectionId === collectionId).length
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    const affected = tasks.filter((t) => t.collectionId === pendingDelete.id)
    await Promise.all(affected.map((t) => repos.tasks.update(t.id, { collectionId: undefined })))
    await repos.taskCollections.remove(pendingDelete.id)
    const deleted = pendingDelete
    setPendingDelete(null)
    show({
      message: `${deleted.name} deleted`,
      action: {
        label: 'Undo',
        onClick: async () => {
          await repos.taskCollections.restore(deleted.id)
          await Promise.all(
            affected.map((t) => repos.tasks.update(t.id, { collectionId: deleted.id })),
          )
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
        <TasksSubNav />
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
              subtitle={`${taskCount(collection.id)} task${taskCount(collection.id) === 1 ? '' : 's'}`}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name}"?`}
        description="Its tasks move to Unfiled — nothing is deleted."
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
