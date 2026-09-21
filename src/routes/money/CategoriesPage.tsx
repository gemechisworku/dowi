import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { Category, TransactionType } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { MoneySubNav } from './MoneySubNav'

const ICON_OPTIONS = [
  '🍽️',
  '🚕',
  '🏠',
  '💡',
  '💊',
  '📚',
  '🛍️',
  '🎬',
  '👨‍👩‍👧',
  '📦',
  '💼',
  '💻',
  '🏢',
  '📈',
  '🎁',
]
const COLOR_OPTIONS = [
  { value: 'var(--color-expense)', label: 'Red' },
  { value: 'var(--color-income)', label: 'Green' },
  { value: 'var(--color-warning)', label: 'Amber' },
  { value: 'var(--blue-500)', label: 'Blue' },
  { value: 'var(--blue-700)', label: 'Dark blue' },
  { value: 'var(--color-text-muted)', label: 'Grey' },
]

export function CategoriesPage() {
  const { repos } = useDatabase()
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const [filterType, setFilterType] = useState<TransactionType>('expense')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_OPTIONS[0]!)
  const [color, setColor] = useState(COLOR_OPTIONS[0]!.value)
  const [type, setType] = useState<TransactionType>('expense')
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [affectedCount, setAffectedCount] = useState(0)
  const [reassignTo, setReassignTo] = useState('')
  const { show } = useSnackbar()

  const visible = categories.filter((c) => c.type === filterType)
  const reassignOptions = pendingDelete
    ? categories.filter((c) => c.type === pendingDelete.type && c.id !== pendingDelete.id)
    : []

  function openCreate() {
    setEditing(null)
    setName('')
    setIcon(ICON_OPTIONS[0]!)
    setColor(COLOR_OPTIONS[0]!.value)
    setType(filterType)
    setSheetOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setIcon(category.icon)
    setColor(category.color)
    setType(category.type)
    setSheetOpen(true)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editing) {
      await repos.categories.update(editing.id, { name: trimmed, icon, color, type })
    } else {
      await repos.categories.create({ name: trimmed, icon, color, type })
    }
    setSheetOpen(false)
  }

  async function requestDelete(category: Category) {
    const affected = await repos.transactions.listFiltered({ categoryId: category.id })
    setAffectedCount(affected.length)
    setReassignTo('')
    setPendingDelete(category)
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    if (affectedCount > 0) {
      if (!reassignTo) return // Select is required in this branch; button stays disabled.
      await repos.transactions.reassignCategory(pendingDelete.id, reassignTo)
    }
    await repos.categories.remove(pendingDelete.id)
    const deleted = pendingDelete
    setPendingDelete(null)
    show({
      message: `${deleted.name} deleted`,
      action: { label: 'Undo', onClick: () => repos.categories.restore(deleted.id) },
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Categories</h1>
        <Button size="sm" onClick={openCreate}>
          Add
        </Button>
      </div>

      <MoneySubNav />

      <SegmentedControl
        label="Category type"
        value={filterType}
        onChange={setFilterType}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />

      <Card>
        {visible.length === 0 ? (
          <EmptyState icon="🏷️" title={`No ${filterType} categories yet`} />
        ) : (
          visible.map((category) => (
            <ListItem
              key={category.id}
              leading={<CategoryIcon icon={category.icon} color={category.color} />}
              title={category.name}
              trailing={
                <div className="flex gap-1">
                  <IconButton
                    aria-label={`Edit ${category.name}`}
                    icon="✎"
                    variant="ghost"
                    onClick={() => openEdit(category)}
                  />
                  <IconButton
                    aria-label={`Delete ${category.name}`}
                    icon="🗑️"
                    variant="ghost"
                    onClick={() => void requestDelete(category)}
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
        title={editing ? 'Edit category' : 'Add category'}
      >
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
          />
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

      {affectedCount === 0 ? (
        <ConfirmDialog
          open={pendingDelete !== null}
          title={`Delete "${pendingDelete?.name}"?`}
          confirmLabel="Delete"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : (
        <Dialog
          open={pendingDelete !== null}
          onClose={() => setPendingDelete(null)}
          title={`Reassign ${affectedCount} transaction${affectedCount === 1 ? '' : 's'}`}
          actions={
            <>
              <Button variant="secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete} disabled={!reassignTo}>
                Reassign &amp; delete
              </Button>
            </>
          }
        >
          <p className="mb-3">
            "{pendingDelete?.name}" is used by {affectedCount} transaction
            {affectedCount === 1 ? '' : 's'}. Choose where they move before this category is deleted
            — nothing is ever deleted silently.
          </p>
          {reassignOptions.length === 0 ? (
            <p style={{ color: 'var(--color-expense)' }}>
              There's no other {pendingDelete?.type} category to reassign to. Add one first.
            </p>
          ) : (
            <Select
              aria-label="Reassign to"
              placeholder="Choose a category"
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              options={reassignOptions.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </Dialog>
      )}
    </div>
  )
}
