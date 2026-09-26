import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useSearchParams } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Task } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { todayString } from '@/lib/period'
import {
  getAllTasks,
  getCompletedTasks,
  getTodayTasks,
  getUpcomingGroups,
  toggleCompletePatch,
} from './taskViews'
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
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

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
  const [searchParams, setSearchParams] = useSearchParams()

  const today = todayString()
  const collectionById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections])
  const thisWeek = useMemo(() => getThisWeek(), [])

  // Deep link from a task-due notification (PRD AC-P4): open that task's
  // edit sheet directly rather than leaving the tap just land on the list.
  // Derived straight from the URL + loaded tasks (not synced via an effect,
  // per the lesson M6 already learned the hard way about set-state-in-effect
  // races — see PLAN.md's ReviewWeekPage bug note) so it naturally resolves
  // once `tasks` finishes loading, with no separate "consume the deep link"
  // step to get out of sync.
  const deepLinkedTaskId = searchParams.get('taskId')
  const deepLinkedTask = deepLinkedTaskId ? tasks.find((t) => t.id === deepLinkedTaskId) : undefined
  const effectiveEditing = editing ?? deepLinkedTask

  function closeEditing() {
    setEditing(undefined)
    if (deepLinkedTaskId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('taskId')
        return next
      })
    }
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

  function renderTask(task: Task) {
    return (
      <TaskListItem
        key={task.id}
        task={task}
        allTasks={tasks}
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
      <PageHeaderBand>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <TasksSubNav />
        <div className="rounded-[var(--radius-md)] border p-3" style={{ background: 'var(--color-on-brand-surface)', borderColor: 'var(--color-on-brand-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                 style={{ color: 'var(--color-on-brand-muted)' }}
              >
                This week
              </p>
              <p className="font-bold">{formatWeekRangeLabel(thisWeek.range)}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/tasks/plan"
                className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                 style={{ background: 'var(--color-on-brand-surface-strong)', color: 'var(--blue-700)' }}
              >
                Plan
              </Link>
              <Link
                to="/tasks/review"
                className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                 style={{ background: 'var(--color-on-brand-surface-strong)', color: 'var(--blue-700)' }}
              >
                Review
              </Link>
            </div>
          </div>
        </div>
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
          variant="inverse"
        />

      {view === 'all' && (
        <div className="flex flex-col gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            data-header-control
          />
          {collections.length > 0 && (
            <ChipGroup label="Collection">
              <Chip selected={collectionFilter === ''} variant="inverse" onClick={() => setCollectionFilter('')}>
                All
              </Chip>
              {collections.map((c) => (
                <Chip
                  key={c.id}
                  selected={collectionFilter === c.id}
                  variant="inverse"
                  onClick={() => setCollectionFilter(c.id)}
                >
                  {c.icon} {c.name}
                </Chip>
              ))}
            </ChipGroup>
          )}
        </div>
      )}
      </PageHeaderBand>

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
      {effectiveEditing && (
        <TaskSheet key={effectiveEditing.id} onClose={closeEditing} task={effectiveEditing} />
      )}
    </div>
  )
}
