import { describe, expect, it } from 'vitest'
import { formatDueLabel, formatGroupDateLabel } from '../dueLabel'
import type { Task } from '@/db/types'

const TODAY = '2026-09-21'

function task(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
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

describe('formatDueLabel', () => {
  it('returns undefined for a task with no due date', () => {
    expect(formatDueLabel(task({}), TODAY)).toBeUndefined()
  })

  it('labels an overdue task with "Overdue" and its date', () => {
    expect(formatDueLabel(task({ dueAt: '2026-09-19T14:00:00' }), TODAY)).toBe('Overdue · Sep 19')
  })

  it('labels a today-due task "Today" with its time', () => {
    expect(formatDueLabel(task({ dueAt: '2026-09-21T14:30:00' }), TODAY)).toBe('Today · 2:30 PM')
  })

  it('labels a today-due task with no time as just "Today"', () => {
    expect(formatDueLabel(task({ dueAt: '2026-09-21T23:59:00' }), TODAY)).toBe('Today · 11:59 PM')
  })

  it('labels tomorrow explicitly', () => {
    expect(formatDueLabel(task({ dueAt: '2026-09-22T09:00:00' }), TODAY)).toBe('Tomorrow · 9:00 AM')
  })

  it('labels a done task by its plain date, never "Overdue"', () => {
    expect(formatDueLabel(task({ dueAt: '2026-09-01T09:00:00', status: 'done' }), TODAY)).toBe(
      'Sep 1',
    )
  })

  it('labels a far-future date as a short date', () => {
    expect(formatDueLabel(task({ dueAt: '2026-12-25T09:00:00' }), TODAY)).toBe('Dec 25')
  })
})

describe('formatGroupDateLabel', () => {
  it('labels tomorrow explicitly', () => {
    expect(formatGroupDateLabel('2026-09-22', TODAY)).toBe('Tomorrow')
  })

  it('labels a later date with its weekday', () => {
    // 2026-09-25 is a Friday.
    expect(formatGroupDateLabel('2026-09-25', TODAY)).toBe('Fri, Sep 25')
  })
})
