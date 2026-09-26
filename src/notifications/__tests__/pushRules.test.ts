import { describe, expect, it } from 'vitest'
import { buildSyncedReminderRules } from '../pushRules'
import type { ReminderConfig, Settings, Task } from '@/db/types'

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

function makeSettings(reminders: ReminderConfig): Settings {
  return {
    id: 'settings',
    baseCurrency: 'ETB',
    weekStartsOn: 1,
    fyStartMonth: 1,
    theme: 'system',
    textSize: 'm',
    density: 'comfortable',
    hideAmounts: false,
    reminders,
  }
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Untitled',
    priority: 'none',
    status: 'todo',
    reminderOffsets: [],
    ...overrides,
  }
}

describe('buildSyncedReminderRules', () => {
  const now = new Date('2026-06-01T12:00:00.000Z')

  it('mirrors the recurring reminder rules from settings verbatim', () => {
    const settings = makeSettings({
      ...REMINDERS_OFF,
      morningNudge: { enabled: true, time: '09:00' },
      eveningStreak: { enabled: true, time: '21:00' },
      weeklyPlan: { enabled: true, day: 1, time: '08:00' },
    })

    const rules = buildSyncedReminderRules(settings, [], now)

    expect(rules.morningNudge).toEqual({ enabled: true, time: '09:00' })
    expect(rules.eveningStreak).toEqual({ enabled: true, time: '21:00' })
    expect(rules.weeklyPlan).toEqual({ enabled: true, day: 1, time: '08:00' })
    expect(rules.quietHours).toEqual(REMINDERS_OFF.quietHours)
  })

  it('omits task-due instants entirely when the task-due reminder is off', () => {
    const settings = makeSettings(REMINDERS_OFF)
    const tasks = [makeTask({ dueAt: '2026-06-02T10:00:00.000Z', reminderOffsets: [0] })]

    expect(buildSyncedReminderRules(settings, tasks, now).taskDueAt).toEqual([])
  })

  it('includes one fire instant per reminder offset, within the horizon, sorted soonest first', () => {
    const settings = makeSettings({ ...REMINDERS_OFF, taskDue: { enabled: true, offsets: [] } })
    const tasks = [
      makeTask({
        id: 'a',
        dueAt: '2026-06-03T10:00:00.000Z',
        reminderOffsets: [0, 60], // due instant, and 1hr before
      }),
      makeTask({
        id: 'b',
        dueAt: '2026-06-02T09:00:00.000Z',
        reminderOffsets: [0],
      }),
    ]

    const result = buildSyncedReminderRules(settings, tasks, now).taskDueAt

    expect(result).toEqual([
      '2026-06-02T09:00:00.000Z', // task b, soonest
      '2026-06-03T09:00:00.000Z', // task a, 1hr-before offset
      '2026-06-03T10:00:00.000Z', // task a, due instant
    ])
  })

  it('excludes done tasks, tasks with no due date, and instants far outside the horizon', () => {
    const settings = makeSettings({ ...REMINDERS_OFF, taskDue: { enabled: true, offsets: [] } })
    const tasks = [
      makeTask({
        id: 'done',
        status: 'done',
        dueAt: '2026-06-02T10:00:00.000Z',
        reminderOffsets: [0],
      }),
      makeTask({ id: 'no-due', reminderOffsets: [0] }),
      makeTask({ id: 'far-future', dueAt: '2026-12-01T10:00:00.000Z', reminderOffsets: [0] }),
      makeTask({ id: 'far-past', dueAt: '2026-01-01T10:00:00.000Z', reminderOffsets: [0] }),
    ]

    expect(buildSyncedReminderRules(settings, tasks, now).taskDueAt).toEqual([])
  })

  it('includes a fire instant slightly in the past, within the grace window', () => {
    const settings = makeSettings({ ...REMINDERS_OFF, taskDue: { enabled: true, offsets: [] } })
    const tasks = [
      makeTask({ dueAt: '2026-06-01T10:00:00.000Z', reminderOffsets: [0] }), // 2h before `now`
    ]

    expect(buildSyncedReminderRules(settings, tasks, now).taskDueAt).toEqual([
      '2026-06-01T10:00:00.000Z',
    ])
  })
})
