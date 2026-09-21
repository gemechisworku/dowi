import { useRef, useState } from 'react'
import type { Subtask } from '@/db/types'
import { TaskCheckbox } from '@/components/domain/TaskCheckbox'
import { Input } from '@/components/ui/Input'

export interface SubtaskEditorProps {
  subtasks: Subtask[]
  onChange: (next: Subtask[]) => void
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `subtask-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Add/rename/toggle/delete/drag-reorder for a task's subtasks (PLAN §M6).
 * Reordering is a live pointer-drag on each row's handle — as the pointer
 * crosses a neighbouring row's midpoint, that row swaps in immediately, the
 * same "shuffle as you drag" feel as native mobile reorder lists, without
 * pulling in a drag-and-drop library for one list.
 */
export function SubtaskEditor({ subtasks, onChange }: SubtaskEditorProps) {
  const [draft, setDraft] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  function addSubtask() {
    const title = draft.trim()
    if (!title) return
    onChange([...subtasks, { id: newId(), title, done: false }])
    setDraft('')
  }

  function updateSubtask(id: string, patch: Partial<Subtask>) {
    onChange(subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function removeSubtask(id: string) {
    onChange(subtasks.filter((s) => s.id !== id))
  }

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragMove(e: React.PointerEvent) {
    if (dragIndex === null) return
    const overIndex = rowRefs.current.findIndex((el) => {
      if (!el) return false
      const rect = el.getBoundingClientRect()
      return e.clientY >= rect.top && e.clientY <= rect.bottom
    })
    if (overIndex === -1 || overIndex === dragIndex) return

    const next = [...subtasks]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(overIndex, 0, moved!)
    onChange(next)
    setDragIndex(overIndex)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  return (
    <div className="flex flex-col gap-1">
      {subtasks.map((subtask, index) => (
        <div
          key={subtask.id}
          ref={(el) => {
            rowRefs.current[index] = el
          }}
          className="flex items-center gap-1 rounded-lg"
          style={{
            background: dragIndex === index ? 'var(--color-surface-2)' : undefined,
            opacity: dragIndex !== null && dragIndex !== index ? 0.85 : 1,
          }}
        >
          <button
            type="button"
            aria-label={`Reorder "${subtask.title}"`}
            onPointerDown={() => handleDragStart(index)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-base active:cursor-grabbing"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ⠿
          </button>
          <TaskCheckbox
            checked={subtask.done}
            onChange={(done) => updateSubtask(subtask.id, { done })}
            label={
              subtask.done ? `Mark "${subtask.title}" not done` : `Mark "${subtask.title}" done`
            }
          />
          <Input
            value={subtask.title}
            onChange={(e) => updateSubtask(subtask.id, { title: e.target.value })}
            aria-label="Subtask title"
            className="flex-1"
            style={{ textDecoration: subtask.done ? 'line-through' : undefined }}
          />
          <button
            type="button"
            aria-label={`Delete "${subtask.title}"`}
            onClick={() => removeSubtask(subtask.id)}
            className="flex h-11 w-9 shrink-0 items-center justify-center text-base"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✕
          </button>
        </div>
      ))}

      <div className="mt-1 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSubtask()
            }
          }}
          placeholder="Add a subtask"
          aria-label="New subtask title"
          className="flex-1"
        />
        <button
          type="button"
          onClick={addSubtask}
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
