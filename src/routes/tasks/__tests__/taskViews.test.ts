import { describe, expect, it } from 'vitest'
import {
  dueDate,
  getAllTasks,
  getCompletedTasks,
  getOverdueCount,
  getTodayTasks,
  getUpcomingGroups,
  isDueToday,
  isOverdue,
  subtaskProgress,
  toggleCompletePatch,
} from '../taskViews'
import type { Task } from '@/db/types'

const TODAY = '2026-09-21'

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task-1',
    title: 'Untitled',
    subtasks: [],
    priority: 'none',
    status: 'todo',
    reminderOffsets: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dueDate', () => {
  it('returns the date part of dueAt', () => {
    expect(dueDate(task({ dueAt: '2026-09-21T14:30:00.000Z' }))).toBe('2026-09-21')
  })

  it('is undefined when there is no due date', () => {
    expect(dueDate(task({}))).toBeUndefined()
  })
})

describe('isOverdue / isDueToday', () => {
  it('a past-dated incomplete task is overdue, not due-today', () => {
    const t = task({ dueAt: '2026-09-19T09:00:00.000Z' })
    expect(isOverdue(t, TODAY)).toBe(true)
    expect(isDueToday(t, TODAY)).toBe(false)
  })

  it('a today-dated incomplete task is due-today, not overdue', () => {
    const t = task({ dueAt: '2026-09-21T09:00:00.000Z' })
    expect(isOverdue(t, TODAY)).toBe(false)
    expect(isDueToday(t, TODAY)).toBe(true)
  })

  it('a done task is neither overdue nor due-today even if the date is in the past', () => {
    const t = task({ dueAt: '2026-09-01T09:00:00.000Z', status: 'done' })
    expect(isOverdue(t, TODAY)).toBe(false)
    expect(isDueToday(t, TODAY)).toBe(false)
  })

  it('a task with no due date is neither', () => {
    const t = task({})
    expect(isOverdue(t, TODAY)).toBe(false)
    expect(isDueToday(t, TODAY)).toBe(false)
  })

  it('a task due later today (future time, same day) is due-today not overdue — day granularity, not time-of-day', () => {
    const t = task({ dueAt: '2026-09-21T23:59:00.000Z' })
    expect(isDueToday(t, TODAY)).toBe(true)
    expect(isOverdue(t, TODAY)).toBe(false)
  })
})

describe('subtaskProgress', () => {
  it('counts done vs total', () => {
    const t = task({
      subtasks: [
        { id: 's1', title: 'a', done: true },
        { id: 's2', title: 'b', done: false },
        { id: 's3', title: 'c', done: true },
      ],
    })
    expect(subtaskProgress(t)).toEqual({ done: 2, total: 3 })
  })

  it('is 0/0 with no subtasks', () => {
    expect(subtaskProgress(task({}))).toEqual({ done: 0, total: 0 })
  })
})

describe('getTodayTasks', () => {
  it('puts overdue tasks before due-today tasks', () => {
    const overdue = task({ id: 'overdue', dueAt: '2026-09-19T09:00:00.000Z' })
    const dueToday = task({ id: 'today', dueAt: '2026-09-21T09:00:00.000Z' })
    const upcoming = task({ id: 'upcoming', dueAt: '2026-09-25T09:00:00.000Z' })
    const noDue = task({ id: 'no-due' })
    const done = task({ id: 'done', dueAt: '2026-09-19T09:00:00.000Z', status: 'done' })

    const result = getTodayTasks([upcoming, dueToday, noDue, done, overdue], TODAY)
    expect(result.map((t) => t.id)).toEqual(['overdue', 'today'])
  })

  it('sorts multiple overdue tasks oldest (most overdue) first', () => {
    const a = task({ id: 'a', dueAt: '2026-09-18T09:00:00.000Z' })
    const b = task({ id: 'b', dueAt: '2026-09-20T09:00:00.000Z' })
    expect(getTodayTasks([b, a], TODAY).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('sorts due-today tasks by time ascending', () => {
    const late = task({ id: 'late', dueAt: '2026-09-21T18:00:00.000Z' })
    const early = task({ id: 'early', dueAt: '2026-09-21T08:00:00.000Z' })
    expect(getTodayTasks([late, early], TODAY).map((t) => t.id)).toEqual(['early', 'late'])
  })
})

describe('getUpcomingGroups', () => {
  it('groups future tasks by day, excluding today and the past', () => {
    const tomorrow = task({ id: 'tomorrow', dueAt: '2026-09-22T09:00:00.000Z' })
    const today = task({ id: 'today', dueAt: '2026-09-21T09:00:00.000Z' })
    const past = task({ id: 'past', dueAt: '2026-09-01T09:00:00.000Z' })

    const groups = getUpcomingGroups([tomorrow, today, past], TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ date: '2026-09-22' })
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(['tomorrow'])
  })

  it('excludes done tasks', () => {
    const done = task({ id: 'done', dueAt: '2026-09-22T09:00:00.000Z', status: 'done' })
    expect(getUpcomingGroups([done], TODAY)).toEqual([])
  })

  it('orders day groups chronologically', () => {
    const later = task({ id: 'later', dueAt: '2026-09-25T09:00:00.000Z' })
    const sooner = task({ id: 'sooner', dueAt: '2026-09-23T09:00:00.000Z' })
    const groups = getUpcomingGroups([later, sooner], TODAY)
    expect(groups.map((g) => g.date)).toEqual(['2026-09-23', '2026-09-25'])
  })

  it('folds anything past the 14-day horizon into a trailing "Later" group', () => {
    const withinHorizon = task({ id: 'within', dueAt: '2026-09-30T09:00:00.000Z' }) // +9 days
    const pastHorizon = task({ id: 'past-horizon', dueAt: '2026-10-20T09:00:00.000Z' }) // +29 days
    const groups = getUpcomingGroups([pastHorizon, withinHorizon], TODAY)
    expect(groups.map((g) => g.date)).toEqual(['2026-09-30', 'Later'])
    expect(groups[1]!.tasks.map((t) => t.id)).toEqual(['past-horizon'])
  })

  it('sorts multiple tasks within a "Later" group by due date', () => {
    const far = task({ id: 'far', dueAt: '2026-12-01T09:00:00.000Z' })
    const nearer = task({ id: 'nearer', dueAt: '2026-11-01T09:00:00.000Z' })
    const groups = getUpcomingGroups([far, nearer], TODAY)
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(['nearer', 'far'])
  })
})

describe('getAllTasks', () => {
  const collectionA = task({ id: 'a', title: 'Buy milk', collectionId: 'errands' })
  const collectionB = task({ id: 'b', title: 'Write report', collectionId: 'work' })
  const noCollection = task({ id: 'c', title: 'Call mum' })
  const done = task({ id: 'd', title: 'Done thing', status: 'done' })

  it('excludes done tasks by default', () => {
    const result = getAllTasks([collectionA, collectionB, noCollection, done])
    expect(result.map((t) => t.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('filters by collection', () => {
    const result = getAllTasks([collectionA, collectionB, noCollection], {
      collectionId: 'errands',
    })
    expect(result.map((t) => t.id)).toEqual(['a'])
  })

  it('filters by case-insensitive title search', () => {
    const result = getAllTasks([collectionA, collectionB, noCollection], { search: 'BUY' })
    expect(result.map((t) => t.id)).toEqual(['a'])
  })

  it('combines collection and search filters', () => {
    const result = getAllTasks([collectionA, collectionB, noCollection], {
      collectionId: 'errands',
      search: 'write',
    })
    expect(result).toEqual([])
  })
})

describe('getOverdueCount', () => {
  it('counts every overdue task, not just however many Home shows', () => {
    const overdue = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      task({ id: `overdue-${n}`, dueAt: '2026-09-19T09:00:00.000Z' }),
    )
    const dueToday = task({ id: 'today', dueAt: '2026-09-21T09:00:00.000Z' })
    const done = task({ id: 'done', dueAt: '2026-09-01T09:00:00.000Z', status: 'done' })
    expect(getOverdueCount([...overdue, dueToday, done], TODAY)).toBe(7)
  })

  it('is 0 when nothing is overdue', () => {
    expect(getOverdueCount([task({ dueAt: '2026-09-21T09:00:00.000Z' })], TODAY)).toBe(0)
  })
})

describe('toggleCompletePatch', () => {
  it('marking done sets status and stamps completedAt', () => {
    const patch = toggleCompletePatch(true)
    expect(patch.status).toBe('done')
    expect(typeof patch.completedAt).toBe('string')
  })

  it('marking not-done clears both', () => {
    expect(toggleCompletePatch(false)).toEqual({ status: 'todo', completedAt: undefined })
  })
})

describe('getCompletedTasks', () => {
  it('returns only done tasks, most recently completed first', () => {
    const older = task({ id: 'older', status: 'done', completedAt: '2026-09-10T00:00:00.000Z' })
    const newer = task({ id: 'newer', status: 'done', completedAt: '2026-09-20T00:00:00.000Z' })
    const notDone = task({ id: 'not-done' })
    const result = getCompletedTasks([older, notDone, newer])
    expect(result.map((t) => t.id)).toEqual(['newer', 'older'])
  })
})
