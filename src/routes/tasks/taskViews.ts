import type { Task } from '@/db/types'
import { shiftPeriod } from '@/lib/period'

/** How many days ahead "Upcoming" groups by day before folding the rest into "Later". */
const UPCOMING_HORIZON_DAYS = 14

/**
 * The date part of `dueAt`, or undefined for a task with no due date.
 * "Overdue"/"due today" are day-granularity concepts here, not time-of-day
 * ones — a task due today at 9am isn't "overdue" the moment 9:01 rolls
 * around, only once the calendar day changes (matches how Money's own
 * date-range filtering treats dates throughout this app).
 */
export function dueDate(task: Task): string | undefined {
  return task.dueAt?.slice(0, 10)
}

export function isOverdue(task: Task, today: string): boolean {
  const d = dueDate(task)
  return task.status !== 'done' && d !== undefined && d < today
}

export function isDueToday(task: Task, today: string): boolean {
  return task.status !== 'done' && dueDate(task) === today
}

/**
 * The patch a task-completion checkbox toggle should apply — shared by
 * every screen that completes a task inline (Tasks' own list, Plan Week,
 * Home) so "what does toggling actually set" lives in exactly one place.
 */
export function toggleCompletePatch(done: boolean): Pick<Task, 'status' | 'completedAt'> {
  return {
    status: done ? 'done' : 'todo',
    completedAt: done ? new Date().toISOString() : undefined,
  }
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length }
}

function byDueAtAsc(a: Task, b: Task): number {
  const ad = a.dueAt ?? ''
  const bd = b.dueAt ?? ''
  return ad < bd ? -1 : ad > bd ? 1 : 0
}

/**
 * Today's view: overdue tasks first (most overdue at the top), then tasks
 * due today, each group sorted by due time — per PRD "Today (overdue first)".
 */
export function getTodayTasks(tasks: readonly Task[], today: string): Task[] {
  const overdue = tasks.filter((t) => isOverdue(t, today)).sort(byDueAtAsc)
  const dueToday = tasks.filter((t) => isDueToday(t, today)).sort(byDueAtAsc)
  return [...overdue, ...dueToday]
}

export interface UpcomingGroup {
  /** A "YYYY-MM-DD" date, or the literal "Later" for everything past the horizon. */
  date: string
  tasks: Task[]
}

/**
 * Incomplete, future-dated tasks grouped by day for the next 14 days;
 * anything further out folds into one trailing "Later" group rather than
 * an ever-growing list of near-empty day headers.
 */
export function getUpcomingGroups(tasks: readonly Task[], today: string): UpcomingGroup[] {
  const horizon = shiftPeriod('day', today, UPCOMING_HORIZON_DAYS)
  const future = tasks.filter((t) => {
    const d = dueDate(t)
    return t.status !== 'done' && d !== undefined && d > today
  })

  const byDate = new Map<string, Task[]>()
  const later: Task[] = []
  for (const t of future) {
    const d = dueDate(t)!
    if (d > horizon) {
      later.push(t)
      continue
    }
    const list = byDate.get(d) ?? []
    list.push(t)
    byDate.set(d, list)
  }

  const groups: UpcomingGroup[] = Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayTasks]) => ({ date, tasks: dayTasks.sort(byDueAtAsc) }))

  if (later.length > 0) groups.push({ date: 'Later', tasks: later.sort(byDueAtAsc) })
  return groups
}

/** Every incomplete task, optionally narrowed to one collection and/or a title search — the "All" view. */
export function getAllTasks(
  tasks: readonly Task[],
  opts: { collectionId?: string; search?: string } = {},
): Task[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .filter((t) => !opts.collectionId || t.collectionId === opts.collectionId)
    .filter((t) => !opts.search || t.title.toLowerCase().includes(opts.search.trim().toLowerCase()))
    .sort(byDueAtAsc)
}

/** Count of tasks overdue as of `today` — Home's red overdue badge, which counts every overdue task, not just the ones that fit inside its 5-item cap. */
export function getOverdueCount(tasks: readonly Task[], today: string): number {
  return tasks.filter((t) => isOverdue(t, today)).length
}

/** Completed tasks, most recently completed first — the "Completed" view. */
export function getCompletedTasks(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}
