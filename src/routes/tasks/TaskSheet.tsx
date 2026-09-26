import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { syncPushRules } from '@/notifications/pushSubscription'
import type { Subtask, Task, TaskPriority } from '@/db/types'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Chip } from '@/components/ui/Chip'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { SubtaskEditor } from './SubtaskEditor'

export interface TaskSheetProps {
  onClose: () => void
  /** Present for edit, absent for create. */
  task?: Task
  /** Pre-selects a collection when creating from a filtered view. */
  initialCollectionId?: string
}

const REMINDER_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'At due time' },
  { minutes: 15, label: '15 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
]

/**
 * The add/edit form for a single task (PLAN §M6), mirroring Money's
 * `TransactionSheet` shape. `notes` is a plain string for now, not the
 * Tiptap JSON `Task.notes` is typed for — M5 hasn't built the editor yet.
 * Stored as-is in that `unknown` field; M5 upgrades it to real rich text
 * without a migration, since a bare string round-trips through Tiptap's
 * own JSON shape as a single paragraph node when that day comes.
 */
export function TaskSheet({ onClose, task, initialCollectionId }: TaskSheetProps) {
  const { db, repos, settingsRepo } = useDatabase()
  const collections = useLiveQuery(() => repos.taskCollections.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const isEdit = Boolean(task)
  const [title, setTitle] = useState(task?.title ?? '')
  const [notes, setNotes] = useState(typeof task?.notes === 'string' ? task.notes : '')
  const [collectionId, setCollectionId] = useState(task?.collectionId ?? initialCollectionId ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'none')
  const [dueDateInput, setDueDateInput] = useState(task?.dueAt?.slice(0, 10) ?? '')
  const [dueTimeInput, setDueTimeInput] = useState(task?.dueAt?.slice(11, 16) ?? '')
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(task?.reminderOffsets ?? [])
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? [])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleReminder(minutes: number) {
    setReminderOffsets((offsets) =>
      offsets.includes(minutes) ? offsets.filter((m) => m !== minutes) : [...offsets, minutes],
    )
  }

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Enter a title.')
      return
    }

    const dueAt = dueDateInput ? `${dueDateInput}T${dueTimeInput || '23:59'}:00` : undefined

    const payload = {
      title: trimmed,
      notes: notes.trim() || undefined,
      collectionId: collectionId || undefined,
      priority,
      dueAt,
      reminderOffsets: dueAt ? reminderOffsets : [],
      subtasks,
    }

    if (task) {
      await repos.tasks.update(task.id, payload)
      show({ message: 'Task updated' })
    } else {
      await repos.tasks.create({ ...payload, status: 'todo' })
      show({ message: 'Task added' })
    }
    // A new/changed due date or reminder offsets shifts when the push
    // server should next wake this device for this task.
    void syncPushRules({ db, settingsRepo, repos })
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    await repos.tasks.remove(task.id)
    void syncPushRules({ db, settingsRepo, repos })
    setConfirmDelete(false)
    onClose()
    show({
      message: 'Task deleted',
      action: { label: 'Undo', onClick: () => repos.tasks.restore(task.id) },
    })
  }

  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit task' : 'Add task'}>
      <div className="flex flex-col gap-4">
        <Field label="Title" required>
          {({ inputId }) => (
            <Input
              id={inputId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          )}
        </Field>

        <Field label="Notes" hint="Optional">
          {({ inputId }) => (
            <TextArea
              id={inputId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          )}
        </Field>

        <Field label="Collection" hint="Optional">
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="Unfiled"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              options={collections.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </Field>

        <SegmentedControl
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'none', label: 'None' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Due date" hint="Optional">
              {({ inputId }) => (
                <DatePicker
                  id={inputId}
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Due time" hint="Optional">
              {({ inputId }) => (
                <TimePicker
                  id={inputId}
                  value={dueTimeInput}
                  onChange={(e) => setDueTimeInput(e.target.value)}
                  disabled={!dueDateInput}
                />
              )}
            </Field>
          </div>
        </div>

        {dueDateInput && (
          <ChipGroup label="Remind me">
            {REMINDER_OPTIONS.map((opt) => (
              <Chip
                key={opt.minutes}
                selected={reminderOffsets.includes(opt.minutes)}
                onClick={() => toggleReminder(opt.minutes)}
              >
                {opt.label}
              </Chip>
            ))}
          </ChipGroup>
        )}

        <Field label="Subtasks">
          {() => <SubtaskEditor subtasks={subtasks} onChange={setSubtasks} />}
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium" style={{ color: 'var(--color-expense)' }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {isEdit && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </Sheet>
  )
}
