import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Task } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { todayString } from '@/lib/period'
import { getAllTasks, getCompletedTasks, getTodayTasks, getUpcomingGroups } from './taskViews'
import { formatGroupDateLabel } from './dueLabel'
import { formatWeekRangeLabel, getThisWeek } from './week'
import { TasksSubNav } from './TasksSubNav'
import { TaskListItem } from './TaskListItem'
import { TaskSheet } from './TaskSheet'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Chip } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useSnackbar } from '@/components/ui/useSnackbar'

type View = 'today' | 'upcoming' | 'all' | 'completed'

export function TasksPage() {
  const { repos } = useDatabase()
  const tasks = useLiveQuery(() => repos.tasks.list(), [repos], EMPTY_ARRAY)
  const collections = useLiveQuery(() => repos.taskCollections.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const [view, setView] = useState<View>('today')
  const [collectionFilter, setCollectionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>(undefined)

  const today = todayString()
  const collectionById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections])
  const thisWeek = useMemo(() => getThisWeek(), [])

  async function handleToggleComplete(task: Task, done: boolean) {
    await repos.tasks.update(task.id, {
      status: done ? 'done' : 'todo',
      completedAt: done ? new Date().toISOString() : undefined,
    })
  }

  async function handleDelete(task: Task) {
    await repos.tasks.remove(task.id)
    show({
      message: 'Task deleted',
      action: { label: 'Undo', onClick: () => repos.tasks.restore(task.id) },
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

  const todayTasks = getTodayTasks(tasks, today)
  const upcomingGroups = getUpcomingGroups(tasks, today)
  const allTasks = getAllTasks(tasks, { collectionId: collectionFilter || undefined, search })
  const completedTasks = getCompletedTasks(tasks)

  return (
    <div className="relative flex flex-col pb-24">
      <div className="px-4 pt-2">
        <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
      </div>

      <div className="px-4 pt-2">
        <TasksSubNav />
      </div>

      <div className="px-4 pt-3">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                This week
              </p>
              <p className="font-bold">{formatWeekRangeLabel(thisWeek.range)}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/tasks/plan"
                className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
              >
                Plan
              </Link>
              <Link
                to="/tasks/review"
                className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
              >
                Review
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-4 pt-3">
        <SegmentedControl
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'all', label: 'All' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </div>

      {view === 'all' && (
        <div className="flex flex-col gap-2 px-4 pt-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
          />
          {collections.length > 0 && (
            <ChipGroup label="Collection">
              <Chip selected={collectionFilter === ''} onClick={() => setCollectionFilter('')}>
                All
              </Chip>
              {collections.map((c) => (
                <Chip
                  key={c.id}
                  selected={collectionFilter === c.id}
                  onClick={() => setCollectionFilter(c.id)}
                >
                  {c.icon} {c.name}
                </Chip>
              ))}
            </ChipGroup>
          )}
        </div>
      )}

      <div className="px-4 pt-3">
        {view === 'today' &&
          (todayTasks.length === 0 ? (
            <EmptyState
              icon="🎉"
              title="Nothing due today"
              description="Enjoy the calm, or check Upcoming."
            />
          ) : (
            <Card>{todayTasks.map(renderTask)}</Card>
          ))}

        {view === 'upcoming' &&
          (upcomingGroups.length === 0 ? (
            <EmptyState icon="📅" title="Nothing upcoming" />
          ) : (
            upcomingGroups.map((group) => (
              <div key={group.date} className="mb-4">
                <SectionHeader
                  title={group.date === 'Later' ? 'Later' : formatGroupDateLabel(group.date, today)}
                />
                <Card>{group.tasks.map(renderTask)}</Card>
              </div>
            ))
          ))}

        {view === 'all' &&
          (allTasks.length === 0 ? (
            <EmptyState
              icon="✅"
              title={search || collectionFilter ? 'No tasks match these filters' : 'No tasks yet'}
              description={search || collectionFilter ? undefined : 'Tap + to add your first task.'}
            />
          ) : (
            <Card>{allTasks.map(renderTask)}</Card>
          ))}

        {view === 'completed' &&
          (completedTasks.length === 0 ? (
            <EmptyState icon="🏁" title="Nothing completed yet" />
          ) : (
            <Card>{completedTasks.map(renderTask)}</Card>
          ))}
      </div>

      <button
        type="button"
        aria-label="Add task"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
        style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-floating)' }}
      >
        +
      </button>

      {addOpen && (
        <TaskSheet
          key="add"
          onClose={() => setAddOpen(false)}
          initialCollectionId={collectionFilter || undefined}
        />
      )}
      {editing && (
        <TaskSheet key={editing.id} onClose={() => setEditing(undefined)} task={editing} />
      )}
    </div>
  )
}
