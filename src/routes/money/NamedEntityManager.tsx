import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SoftDeleteRepo } from '@/db/softDeleteRepo'
import type { BaseEntity } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { MoneySubNav } from './MoneySubNav'

interface NamedEntity extends BaseEntity {
  name: string
}

export interface NamedEntityManagerProps {
  title: string
  /** Singular form, e.g. "Source" for a title of "Sources" — used in sheet titles. */
  singular: string
  icon: string
  emptyLabel: string
  repo: SoftDeleteRepo<NamedEntity, { name: string }>
}

/**
 * Full CRUD for a plain "just a name" entity — Sources and Accounts share
 * this exact shape (PRD §5.3), so one screen serves both rather than two
 * near-identical copies.
 */
export function NamedEntityManager({
  title,
  singular,
  icon,
  emptyLabel,
  repo,
}: NamedEntityManagerProps) {
  const items = useLiveQuery(() => repo.list(), [repo], EMPTY_ARRAY)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<NamedEntity | null>(null)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<NamedEntity | null>(null)
  const { show } = useSnackbar()

  function openCreate() {
    setEditing(null)
    setName('')
    setSheetOpen(true)
  }

  function openEdit(item: NamedEntity) {
    setEditing(item)
    setName(item.name)
    setSheetOpen(true)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editing) {
      await repo.update(editing.id, { name: trimmed })
    } else {
      await repo.create({ name: trimmed })
    }
    setSheetOpen(false)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const deleted = confirmDelete
    await repo.remove(deleted.id)
    setConfirmDelete(null)
    show({
      message: `${deleted.name} deleted`,
      action: { label: 'Undo', onClick: () => repo.restore(deleted.id) },
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <Button size="sm" onClick={openCreate}>
          Add
        </Button>
      </div>

      <MoneySubNav />

      <Card>
        {items.length === 0 ? (
          <EmptyState icon={icon} title={emptyLabel} />
        ) : (
          items.map((item) => (
            <ListItem
              key={item.id}
              title={item.name}
              trailing={
                <div className="flex gap-1">
                  <IconButton
                    aria-label={`Edit ${item.name}`}
                    icon="✎"
                    variant="ghost"
                    onClick={() => openEdit(item)}
                  />
                  <IconButton
                    aria-label={`Delete ${item.name}`}
                    icon="🗑️"
                    variant="ghost"
                    onClick={() => setConfirmDelete(item)}
                  />
                </div>
              }
            />
          ))
        )}
      </Card>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? `Edit ${singular}` : `Add ${singular}`}
      >
        <Field label="Name" required>
          {({ inputId }) => (
            <Input id={inputId} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          )}
        </Field>
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
        open={confirmDelete !== null}
        title={`Delete "${confirmDelete?.name}"?`}
        description="Transactions using it keep their record but show it as removed."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
