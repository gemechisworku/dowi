import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { Task } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { TaskCheckbox } from '@/components/domain/TaskCheckbox'
import { Input } from '@/components/ui/Input'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { toggleCompletePatch } from './taskViews'

export interface SubtaskEditorProps {
  parentTaskId: string
  /**
   * Opening a subtask's full editor is the parent TaskSheet's job, not this
   * component's — it has to hide its own Sheet first (see TaskSheet.tsx's
   * `openSubtask` comment for why two Sheets can't just stack).
   */
  onOpenSubtask: (task: Task) => void
}

/**
 * A task's subtasks (PLAN §M6, upgraded post-M12) — real child Task rows
 * (Task.parentTaskId), not a lightweight embedded shape, so a subtask can
 * have everything a task has. This row itself only supports quick add,
 * check-off and delete; tapping one opens the full TaskSheet for notes, a
 * due date, priority or reminders — same editor the parent task uses.
 *
 * Manual drag-reorder (the pre-M13 embedded-array version supported it)
 * is dropped: children now sort by creation order like every other task
 * list in the app, rather than adding a bespoke ordering field just for
 * this one nested list.
 */
export function SubtaskEditor({ parentTaskId, onOpenSubtask }: SubtaskEditorProps) {
  const { repos } = useDatabase()
  const children = useLiveQuery(
    () => repos.tasks.listByParent(parentTaskId),
    [repos, parentTaskId],
    EMPTY_ARRAY,
  )
  const [draft, setDraft] = useState('')
  const { show } = useSnackbar()

  async function addSubtask() {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    await repos.tasks.create({
      title,
      parentTaskId,
      priority: 'none',
      status: 'todo',
      reminderOffsets: [],
    })
  }

  async function removeSubtask(child: Task) {
    await repos.tasks.remove(child.id)
    show({
      message: 'Subtask deleted',
      action: { label: 'Undo', onClick: () => repos.tasks.restore(child.id) },
    })
  }

  return (
    <div className="flex flex-col gap-1">
      {children.map((child) => {
        const isDone = child.status === 'done'
        return (
          <div key={child.id} className="flex items-center gap-1">
            <TaskCheckbox
              checked={isDone}
              onChange={(done) => void repos.tasks.update(child.id, toggleCompletePatch(done))}
              label={isDone ? `Mark "${child.title}" not done` : `Mark "${child.title}" done`}
            />
            <button
              type="button"
              onClick={() => onOpenSubtask(child)}
              className="flex-1 truncate text-left text-[15px]"
              style={{
                textDecoration: isDone ? 'line-through' : undefined,
                color: isDone ? 'var(--color-text-muted)' : undefined,
              }}
            >
              {child.title}
            </button>
            <button
              type="button"
              aria-label={`Delete "${child.title}"`}
              onClick={() => void removeSubtask(child)}
              className="flex h-11 w-9 shrink-0 items-center justify-center text-base"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          </div>
        )
      })}

      <div className="mt-1 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void addSubtask()
            }
          }}
          placeholder="Add a subtask"
          aria-label="New subtask title"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => void addSubtask()}
          disabled={!draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base disabled:opacity-40"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
          aria-label="Add subtask"
        >
          +
        </button>
      </div>
    </div>
  )
}
