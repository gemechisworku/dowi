import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Task } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { formatWeekRangeLabel, getLastWeek, getThisWeek } from './week'
import { toggleCompletePatch } from './taskViews'
import { TasksSubNav } from './TasksSubNav'
import { TaskListItem } from './TaskListItem'
import { TaskSheet } from './TaskSheet'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListItem } from '@/components/ui/ListItem'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useSnackbar } from '@/components/ui/useSnackbar'

/**
 * Plan-the-week screen (PLAN §M6): this week's tasks plus a quick-add
 * straight into the week, and a carry-forward list of last week's
 * still-incomplete tasks. Reachable any day — nothing here is gated on
 * which day of the week it actually is.
 */
export function PlanWeekPage() {
  const { repos } = useDatabase()
  const tasks = useLiveQuery(() => repos.tasks.list(), [repos], EMPTY_ARRAY)
  const collections = useLiveQuery(() => repos.taskCollections.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const thisWeek = useMemo(() => getThisWeek(), [])
  const lastWeek = useMemo(() => getLastWeek(), [])
  const collectionById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections])

  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<Task | undefined>(undefined)

  const thisWeekTasks = tasks.filter((t) => t.weekKey === thisWeek.weekKey)
  const carryForward = tasks.filter((t) => t.weekKey === lastWeek.weekKey && t.status !== 'done')

  async function handleQuickAdd() {
    const title = draft.trim()
    if (!title) return
    // Cleared before the write, not after: clearing post-await raced typing
    // the *next* task's title into the same field — if that typing landed
    // before this write resolved, the delayed clear would wipe it back out
    // right after. Clearing first removes the race outright rather than
    // narrowing it.
    setDraft('')
    await repos.tasks.create({
      title,
      subtasks: [],
      priority: 'none',
      status: 'todo',
      reminderOffsets: [],
      weekKey: thisWeek.weekKey,
    })
  }

  async function handleToggleComplete(task: Task, done: boolean) {
    await repos.tasks.update(task.id, toggleCompletePatch(done))
  }

  async function handleDelete(task: Task) {
    await repos.tasks.remove(task.id)
    show({
      message: 'Task deleted',
      action: { label: 'Undo', onClick: () => repos.tasks.restore(task.id) },
    })
  }

  async function moveToThisWeek(task: Task) {
    await repos.tasks.update(task.id, { weekKey: thisWeek.weekKey })
  }

  async function moveAllToThisWeek() {
    await Promise.all(
      carryForward.map((t) => repos.tasks.update(t.id, { weekKey: thisWeek.weekKey })),
    )
    show({
      message: `Moved ${carryForward.length} task${carryForward.length === 1 ? '' : 's'} to this week`,
    })
  }

  function renderTask(task: Task) {
    return (
      <TaskListItem
        key={task.id}
        task={task}
        collection={task.collectionId ? collectionById.get(task.collectionId) : undefined}
        onToggleComplete={(t, done) => void handleToggleComplete(t, done)}
        onOpen={setEditing}
        onDelete={(t) => void handleDelete(t)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <div>
        <Link
          to="/tasks"
          className="text-sm font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          ‹ Tasks
        </Link>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Plan the week</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {formatWeekRangeLabel(thisWeek.range)}
        </p>
      </div>

      <TasksSubNav />

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleQuickAdd()
            }
          }}
          placeholder="Add straight into this week"
          aria-label="Add a task to this week"
          className="flex-1"
        />
        <Button onClick={() => void handleQuickAdd()} disabled={!draft.trim()}>
          Add
        </Button>
      </div>

      <div>
        <SectionHeader title="This week" />
        {thisWeekTasks.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="Nothing planned yet"
            description="Add a task above to get started."
          />
        ) : (
          <Card>{thisWeekTasks.map(renderTask)}</Card>
        )}
      </div>

      {carryForward.length > 0 && (
        <div>
          <SectionHeader
            title={`Carried over from last week (${carryForward.length})`}
            action={
              <button
                type="button"
                onClick={() => void moveAllToThisWeek()}
                className="text-xs font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                Move all
              </button>
            }
          />
          <Card>
            {carryForward.map((task) => (
              <ListItem
                key={task.id}
                title={task.title}
                subtitle={
                  task.collectionId ? collectionById.get(task.collectionId)?.name : undefined
                }
                trailing={
                  <button
                    type="button"
                    onClick={() => void moveToThisWeek(task)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
                  >
                    Move to this week
                  </button>
                }
              />
            ))}
          </Card>
        </div>
      )}

      {editing && (
        <TaskSheet key={editing.id} onClose={() => setEditing(undefined)} task={editing} />
      )}
    </div>
  )
}
