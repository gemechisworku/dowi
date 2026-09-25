import { describe, expect, it } from 'vitest'
import { getLocalNow, isDeviceDueNow, isTimeDueNow } from '../dueCheck'
import type { PushDeviceEntry, SyncedReminderRules } from '../types'

const RULES_OFF: SyncedReminderRules = {
  morningNudge: { enabled: false, time: '09:00' },
  eveningStreak: { enabled: false, time: '21:00' },
  dailyAgenda: { enabled: false, time: '07:30' },
  weeklyPlan: { enabled: false, day: 1, time: '08:00' },
  weeklyReview: { enabled: false, day: 6, time: '18:00' },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  taskDueAt: [],
}

function makeEntry(overrides: Partial<PushDeviceEntry>): PushDeviceEntry {
  return {
    subscription: {
      endpoint: 'https://example.com/x',
      expirationTime: null,
      keys: { p256dh: 'a', auth: 'b' },
    },
    timeZone: 'UTC',
    rules: RULES_OFF,
    lastFired: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// Monday, 09:00:00 UTC.
const MONDAY_9AM = new Date('2026-06-01T09:00:00.000Z')

describe('getLocalNow', () => {
  it('reads date, ISO week, day-of-week and minute-of-day in the given timezone', () => {
    const local = getLocalNow(MONDAY_9AM, 'UTC')
    expect(local.isoDate).toBe('2026-06-01')
    expect(local.dayOfWeek).toBe(1) // Monday
    expect(local.minuteOfDay).toBe(9 * 60)
    expect(local.isoWeek).toBe('2026-W23')
  })

  it('shifts date/day/minute for a non-UTC timezone crossing midnight', () => {
    // 09:00 UTC Monday is 01:00 Monday in a UTC-8 zone... use a zone that
    // actually crosses to Sunday instead, e.g. UTC-10 (Pacific/Honolulu).
    const local = getLocalNow(MONDAY_9AM, 'Pacific/Honolulu')
    expect(local.isoDate).toBe('2026-05-31')
    expect(local.dayOfWeek).toBe(0) // Sunday
    expect(local.minuteOfDay).toBe(23 * 60) // 09:00 UTC - 10h = 23:00 previous day
  })
})

describe('isTimeDueNow', () => {
  const local = getLocalNow(MONDAY_9AM, 'UTC') // minuteOfDay = 540

  it('is true within tolerance', () => {
    expect(isTimeDueNow('09:00', local, 2)).toBe(true)
    expect(isTimeDueNow('09:02', local, 2)).toBe(true)
    expect(isTimeDueNow('08:58', local, 2)).toBe(true)
  })

  it('is false outside tolerance', () => {
    expect(isTimeDueNow('09:05', local, 2)).toBe(false)
    expect(isTimeDueNow('08:50', local, 2)).toBe(false)
  })

  it('wraps around midnight', () => {
    const nearMidnight = getLocalNow(new Date('2026-06-01T23:59:00.000Z'), 'UTC')
    expect(isTimeDueNow('00:01', nearMidnight, 2)).toBe(true)
  })
})

describe('isDeviceDueNow', () => {
  it('is not due when nothing is enabled', () => {
    const entry = makeEntry({})
    expect(isDeviceDueNow(entry, MONDAY_9AM)).toEqual({ due: false, firedUpdates: {} })
  })

  it('fires a daily rule whose time matches and has not fired today', () => {
    const entry = makeEntry({
      rules: { ...RULES_OFF, morningNudge: { enabled: true, time: '09:00' } },
    })
    const result = isDeviceDueNow(entry, MONDAY_9AM)
    expect(result.due).toBe(true)
    expect(result.firedUpdates.morningNudge).toBe('2026-06-01')
  })

  it('does not re-fire a daily rule already recorded for today', () => {
    const entry = makeEntry({
      rules: { ...RULES_OFF, morningNudge: { enabled: true, time: '09:00' } },
      lastFired: { morningNudge: '2026-06-01' },
    })
    expect(isDeviceDueNow(entry, MONDAY_9AM)).toEqual({ due: false, firedUpdates: {} })
  })

  it('fires a weekly rule only on its configured day', () => {
    const entry = makeEntry({
      rules: { ...RULES_OFF, weeklyPlan: { enabled: true, day: 1, time: '09:00' } }, // Monday
    })
    expect(isDeviceDueNow(entry, MONDAY_9AM).due).toBe(true)

    const tuesdaySameTime = new Date('2026-06-02T09:00:00.000Z')
    expect(isDeviceDueNow(entry, tuesdaySameTime).due).toBe(false)
  })

  it('suppresses everything during quiet hours, even if a rule time matches', () => {
    const entry = makeEntry({
      rules: {
        ...RULES_OFF,
        morningNudge: { enabled: true, time: '09:00' },
        quietHours: { enabled: true, start: '22:00', end: '10:00' },
      },
    })
    expect(isDeviceDueNow(entry, MONDAY_9AM)).toEqual({ due: false, firedUpdates: {} })
  })

  it('fires a task-due instant within tolerance and excludes ones already fired', () => {
    const dueSoon = new Date(MONDAY_9AM.getTime() + 60_000).toISOString() // 1 min later
    const alreadyFired = new Date(MONDAY_9AM.getTime() + 90_000).toISOString()
    const entry = makeEntry({
      rules: { ...RULES_OFF, taskDueAt: [dueSoon, alreadyFired] },
      lastFired: { taskDueAt: [alreadyFired] },
    })
    const result = isDeviceDueNow(entry, MONDAY_9AM)
    expect(result.due).toBe(true)
    expect(result.firedUpdates.taskDueAt).toEqual([alreadyFired, dueSoon])
  })

  it('reports every rule that matches simultaneously, all in one result', () => {
    const entry = makeEntry({
      rules: {
        ...RULES_OFF,
        morningNudge: { enabled: true, time: '09:00' },
        dailyAgenda: { enabled: true, time: '09:00' },
      },
    })
    const result = isDeviceDueNow(entry, MONDAY_9AM)
    expect(result.firedUpdates.morningNudge).toBe('2026-06-01')
    expect(result.firedUpdates.dailyAgenda).toBe('2026-06-01')
  })
})
