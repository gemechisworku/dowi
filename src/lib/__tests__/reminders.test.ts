import { describe, expect, it } from 'vitest'
import { computeDueReminders, isWithinQuietHours } from '../reminders'
import type { AppNotification, ReminderConfig, Settings, Task } from '@/db/types'

const REMINDERS_OFF: ReminderConfig = {
  weeklyPlan: { enabled: false, day: 1, time: '08:00' },
  weeklyReview: { enabled: false, day: 6, time: '18:00' },
  taskDue: { enabled: false, offsets: [0, 1440] },
  dailyAgenda: { enabled: false, time: '07:30' },
  backupNudge: { enabled: false, intervalDays: 30 },
  morningNudge: { enabled: false, time: '09:00' },
  eveningStreak: { enabled: false, time: '21:00' },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
}

function baseSettings(
  overrides: Partial<ReminderConfig> = {},
  settingsOverrides: Partial<Settings> = {},
): Settings {
  return {
    id: 'settings',
    baseCurrency: 'ETB',
    weekStartsOn: 1,
    fyStartMonth: 1,
    theme: 'system',
    textSize: 'm',
    density: 'comfortable',
    hideAmounts: false,
    reminders: { ...REMINDERS_OFF, ...overrides },
    ...settingsOverrides,
  }
}

function baseTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString()
  return {
    id: 't1',
    title: 'Test task',
    subtasks: [],
    priority: 'none',
    status: 'todo',
    reminderOffsets: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const INSTALLED_AT = '2026-01-01T00:00:00.000Z'

describe('isWithinQuietHours', () => {
  const overnight: ReminderConfig['quietHours'] = { enabled: true, start: '22:00', end: '07:00' }
  const sameDay: ReminderConfig['quietHours'] = { enabled: true, start: '13:00', end: '14:00' }

  it('is false when quiet hours are disabled, regardless of time', () => {
    expect(
      isWithinQuietHours(new Date('2026-09-21T23:00:00'), { ...overnight, enabled: false }),
    ).toBe(false)
  })

  it('handles an overnight range correctly on both sides of midnight', () => {
    expect(isWithinQuietHours(new Date('2026-09-21T23:00:00'), overnight)).toBe(true)
    expect(isWithinQuietHours(new Date('2026-09-22T03:00:00'), overnight)).toBe(true)
    expect(isWithinQuietHours(new Date('2026-09-22T07:00:00'), overnight)).toBe(false)
    expect(isWithinQuietHours(new Date('2026-09-21T21:59:00'), overnight)).toBe(false)
  })

  it('handles a same-day range', () => {
    expect(isWithinQuietHours(new Date('2026-09-21T13:30:00'), sameDay)).toBe(true)
    expect(isWithinQuietHours(new Date('2026-09-21T12:59:00'), sameDay)).toBe(false)
    expect(isWithinQuietHours(new Date('2026-09-21T14:00:00'), sameDay)).toBe(false)
  })

  it('is false when start equals end (a degenerate zero-length window)', () => {
    expect(
      isWithinQuietHours(new Date('2026-09-21T13:00:00'), {
        enabled: true,
        start: '13:00',
        end: '13:00',
      }),
    ).toBe(false)
  })
})

describe('computeDueReminders — weekly plan / review', () => {
  it('raises the weekly plan reminder once its day+time has passed, and not before', () => {
    // 2026-09-21 is a Monday.
    const settings = baseSettings({ weeklyPlan: { enabled: true, day: 1, time: '08:00' } })
    const before = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T07:59:00'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(before.find((r) => r.type === 'weekly-plan')).toBeUndefined()

    const after = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T08:01:00'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    const reminder = after.find((r) => r.type === 'weekly-plan')
    expect(reminder).toMatchObject({ deepLink: '/tasks/plan' })
    expect(reminder?.scheduledFor).toBe(new Date('2026-09-21T08:00:00').toISOString())
  })

  it('does not raise the same weekly occurrence twice once it exists', () => {
    const settings = baseSettings({ weeklyReview: { enabled: true, day: 6, time: '18:00' } })
    const now = new Date('2026-09-26T19:00:00') // Saturday, after 18:00
    const occurrence = new Date('2026-09-26T18:00:00').toISOString()
    const existing: AppNotification[] = [
      {
        id: 'n1',
        type: 'weekly-review',
        title: 'x',
        body: 'x',
        scheduledFor: occurrence,
        deepLink: '/tasks/review',
        read: false,
        createdAt: now.toISOString(),
      },
    ]
    const due = computeDueReminders({
      settings,
      tasks: [],
      now,
      existing,
      installedAt: INSTALLED_AT,
    })
    expect(due.find((r) => r.type === 'weekly-review')).toBeUndefined()
  })

  it('skips a weekly occurrence older than the catch-up window', () => {
    const settings = baseSettings({ weeklyPlan: { enabled: true, day: 1, time: '08:00' } })
    // A full 10 days after the Monday 08:00 occurrence, well past a 3-day window.
    const now = new Date('2026-10-01T09:00:00')
    const due = computeDueReminders({
      settings,
      tasks: [],
      now,
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(due.find((r) => r.type === 'weekly-plan')).toBeUndefined()
  })
})

describe('computeDueReminders — daily agenda', () => {
  it('fires today once the time has passed, and falls back to yesterday before it', () => {
    const settings = baseSettings({ dailyAgenda: { enabled: true, time: '07:30' } })
    const beforeToday = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T07:00:00'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    // Yesterday's occurrence (07:30 the day before) is within the 3-day catch-up window.
    expect(beforeToday.find((r) => r.type === 'daily-agenda')?.scheduledFor).toBe(
      new Date('2026-09-20T07:30:00').toISOString(),
    )

    const afterToday = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T08:00:00'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(afterToday.find((r) => r.type === 'daily-agenda')?.scheduledFor).toBe(
      new Date('2026-09-21T07:30:00').toISOString(),
    )
  })
})

describe('computeDueReminders — morning nudge', () => {
  it('fires today once the time has passed, and falls back to yesterday before it', () => {
    const settings = baseSettings({ morningNudge: { enabled: true, time: '09:00' } })
    const before = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T08:00:00'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(before.find((r) => r.type === 'morning-nudge')?.scheduledFor).toBe(
      new Date('2026-09-20T09:00:00').toISOString(),
    )

    const after = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T09:30:00'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(after.find((r) => r.type === 'morning-nudge')?.scheduledFor).toBe(
      new Date('2026-09-21T09:00:00').toISOString(),
    )
  })
})

describe('computeDueReminders — evening streak', () => {
  const settings = baseSettings({ eveningStreak: { enabled: true, time: '21:00' } })

  it('fires when nothing has been logged yet today', () => {
    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T21:30:00'),
      existing: [],
      installedAt: INSTALLED_AT,
      streakLastActiveDate: '2026-09-20',
    })
    expect(due.find((r) => r.type === 'evening-streak')).toBeDefined()
  })

  it('is suppressed once a qualifying action already happened today', () => {
    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T21:30:00'),
      existing: [],
      installedAt: INSTALLED_AT,
      streakLastActiveDate: '2026-09-21',
    })
    expect(due.find((r) => r.type === 'evening-streak')).toBeUndefined()
  })

  it('fires when no activity has ever been recorded', () => {
    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T21:30:00'),
      existing: [],
      installedAt: INSTALLED_AT,
      streakLastActiveDate: null,
    })
    expect(due.find((r) => r.type === 'evening-streak')).toBeDefined()
  })

  it('does not double-fire once already recorded in the notifications inbox', () => {
    const scheduledFor = new Date('2026-09-21T21:00:00').toISOString()
    const existing: AppNotification[] = [
      {
        id: 'n1',
        type: 'evening-streak',
        title: '',
        body: '',
        scheduledFor,
        deepLink: '/',
        read: false,
        createdAt: scheduledFor,
      },
    ]
    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-09-21T21:30:00'),
      existing,
      installedAt: INSTALLED_AT,
      streakLastActiveDate: '2026-09-20',
    })
    expect(due.find((r) => r.type === 'evening-streak')).toBeUndefined()
  })
})

describe('computeDueReminders — task due', () => {
  it('raises a reminder per offset once each has passed, skipping completed tasks and tasks without a due date', () => {
    const settings = baseSettings({ taskDue: { enabled: true, offsets: [0, 1440] } })
    const dueAt = '2026-09-21T12:00:00.000Z'
    const tasks: Task[] = [
      baseTask({ id: 'a', title: 'Has due date', dueAt, reminderOffsets: [0, 1440] }),
      baseTask({ id: 'b', title: 'Done already', status: 'done', dueAt, reminderOffsets: [0] }),
      baseTask({ id: 'c', title: 'No due date', reminderOffsets: [0] }),
    ]

    // 1 day before due (the 1440-offset fires), but not yet at due time.
    const due = computeDueReminders({
      settings,
      tasks,
      now: new Date(new Date(dueAt).getTime() - 12 * 60 * 60 * 1000),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({
      type: 'task-due',
      title: 'Has due date',
      deepLink: '/tasks?taskId=a',
    })
  })

  it('raises the at-due-time reminder once the due time itself has passed', () => {
    const settings = baseSettings({ taskDue: { enabled: true, offsets: [0] } })
    const dueAt = '2026-09-21T12:00:00.000Z'
    const tasks: Task[] = [baseTask({ id: 'a', dueAt, reminderOffsets: [0] })]
    const due = computeDueReminders({
      settings,
      tasks,
      now: new Date('2026-09-21T12:01:00.000Z'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({ body: 'Due now' })
  })

  it('is a no-op when task-due reminders are disabled globally', () => {
    const settings = baseSettings({ taskDue: { enabled: false, offsets: [0] } })
    const tasks: Task[] = [
      baseTask({ id: 'a', dueAt: '2026-09-21T12:00:00.000Z', reminderOffsets: [0] }),
    ]
    const due = computeDueReminders({
      settings,
      tasks,
      now: new Date('2026-09-21T12:01:00.000Z'),
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(due).toHaveLength(0)
  })
})

describe('computeDueReminders — backup nudge', () => {
  it('uses installedAt as the baseline when there has never been a backup', () => {
    const settings = baseSettings({ backupNudge: { enabled: true, intervalDays: 30 } })
    const notDue = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-01-20T00:00:00.000Z'), // 19 days after installedAt
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(notDue.find((r) => r.type === 'backup-nudge')).toBeUndefined()

    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-02-01T00:00:00.000Z'), // 31 days after installedAt
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(due.find((r) => r.type === 'backup-nudge')).toMatchObject({ deepLink: '/settings' })
  })

  it('resets the baseline to the most recent real export', () => {
    const settings = baseSettings(
      { backupNudge: { enabled: true, intervalDays: 30 } },
      { lastBackupAt: '2026-03-01T00:00:00.000Z' },
    )
    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date('2026-03-20T00:00:00.000Z'), // 19 days after the export
      existing: [],
      installedAt: INSTALLED_AT,
    })
    expect(due.find((r) => r.type === 'backup-nudge')).toBeUndefined()
  })

  it('recurs from the previous nudge when the user still has not exported', () => {
    const settings = baseSettings({ backupNudge: { enabled: true, intervalDays: 30 } })
    const previousNudge = new Date(
      new Date(INSTALLED_AT).getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const existing: AppNotification[] = [
      {
        id: 'n1',
        type: 'backup-nudge',
        title: 'x',
        body: 'x',
        scheduledFor: previousNudge,
        deepLink: '/settings',
        read: true,
        createdAt: previousNudge,
      },
    ]
    // Not due again until 30 more days after the previous nudge.
    const notDue = computeDueReminders({
      settings,
      tasks: [],
      now: new Date(new Date(previousNudge).getTime() + 10 * 24 * 60 * 60 * 1000),
      existing,
      installedAt: INSTALLED_AT,
    })
    expect(notDue.find((r) => r.type === 'backup-nudge')).toBeUndefined()

    const due = computeDueReminders({
      settings,
      tasks: [],
      now: new Date(new Date(previousNudge).getTime() + 31 * 24 * 60 * 60 * 1000),
      existing,
      installedAt: INSTALLED_AT,
    })
    expect(due.find((r) => r.type === 'backup-nudge')).toBeDefined()
  })
})
