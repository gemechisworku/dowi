import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestDb } from '@/db/__tests__/testDb'
import { createSettingsRepo } from '@/db/settingsRepo'
import { createNotificationsRepo } from '@/db/notificationsRepo'
import { createRepositories } from '@/db/repositories'
import { createWebScheduler, type ReminderScheduler } from '../scheduler'
import * as permission from '../permission'
import * as deliver from '../deliver'
import type { DowiDatabase } from '@/db/db'
import type { ReminderConfig } from '@/db/types'

vi.mock('../permission')
vi.mock('../deliver')

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

describe('createWebScheduler.catchUp', () => {
  let db: DowiDatabase
  let scheduler: ReminderScheduler
  let notificationsRepo: ReturnType<typeof createNotificationsRepo>
  let settingsRepo: ReturnType<typeof createSettingsRepo>

  beforeEach(async () => {
    db = createTestDb()
    settingsRepo = createSettingsRepo(db)
    notificationsRepo = createNotificationsRepo(db)
    const repos = createRepositories(db)
    scheduler = createWebScheduler({ db, settingsRepo, notificationsRepo, repos })
    // fake-indexeddb's internal scheduling doesn't tolerate vi.useFakeTimers(),
    // so instead of mocking "now" we anchor the weekly-plan reminder to
    // midnight *today* — always already-passed by the time a test runs,
    // and always within computeDueReminders' 3-day catch-up window.
    await settingsRepo.update({
      reminders: {
        ...REMINDERS_OFF,
        weeklyPlan: { enabled: true, day: new Date().getDay(), time: '00:00' },
      },
    })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.delete()
  })

  it('writes an inbox entry and delivers via OS when permission is granted and outside quiet hours', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)

    await scheduler.catchUp()

    const all = await notificationsRepo.list()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ type: 'weekly-plan', deliveredAt: expect.any(String) })
    expect(deliver.showOsNotification).toHaveBeenCalledTimes(1)
  })

  it('writes an inbox entry but skips OS delivery when permission is not granted', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('denied')

    await scheduler.catchUp()

    const all = await notificationsRepo.list()
    expect(all).toHaveLength(1)
    expect(all[0]?.deliveredAt).toBeUndefined()
    expect(deliver.showOsNotification).not.toHaveBeenCalled()
  })

  it('writes an inbox entry but skips OS delivery during quiet hours', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    await settingsRepo.update({
      reminders: {
        ...REMINDERS_OFF,
        weeklyPlan: { enabled: true, day: new Date().getDay(), time: '00:00' },
        quietHours: { enabled: true, start: '00:00', end: '23:59' },
      },
    })

    await scheduler.catchUp()

    const all = await notificationsRepo.list()
    expect(all).toHaveLength(1)
    expect(all[0]?.deliveredAt).toBeUndefined()
    expect(deliver.showOsNotification).not.toHaveBeenCalled()
  })

  it('does not raise the same occurrence twice across repeated calls', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)

    await scheduler.catchUp()
    await scheduler.catchUp()

    expect(await notificationsRepo.list()).toHaveLength(1)
  })

  it('does not raise the same occurrence twice when two catchUps race — the real-world case of a push event and periodicsync (or two tabs) firing at once', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)

    // Deliberately concurrent, not sequential — the dedup-critical read
    // (what's already been raised) and write (create the new row) has to
    // be safe from this exact race, not just from two calls that happen
    // not to overlap.
    await Promise.all([scheduler.catchUp(), scheduler.catchUp()])

    expect(await notificationsRepo.list()).toHaveLength(1)
    expect(deliver.showOsNotification).toHaveBeenCalledTimes(1)
  })

  it('never re-raises an occurrence that was cleared from the inbox — clearing must not look like "never sent"', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)

    await scheduler.catchUp()
    const [first] = await notificationsRepo.list()
    await notificationsRepo.clear(first!.id)
    expect(await notificationsRepo.list()).toHaveLength(0)

    await scheduler.catchUp()

    expect(await notificationsRepo.list()).toHaveLength(0)
    expect(await notificationsRepo.listAllEverRaised()).toHaveLength(1)
    expect(deliver.showOsNotification).toHaveBeenCalledTimes(1)
  })

  it('suppresses the evening streak reminder once a real qualifying activity was recorded today — proves catchUp actually reads the live streak state, not just computeDueReminders in isolation', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)
    await settingsRepo.update({
      reminders: { ...REMINDERS_OFF, eveningStreak: { enabled: true, time: '00:00' } },
    })
    const repos = createRepositories(db)
    await repos.transactions.create({
      type: 'income',
      amountMinorUnits: 1000,
      currency: 'ETB',
      date: new Date().toISOString().slice(0, 10),
      categoryId: 'cat-1',
      tags: [],
    })

    await scheduler.catchUp()

    const all = await notificationsRepo.list()
    expect(all.find((n) => n.type === 'evening-streak')).toBeUndefined()
  })

  it('suppresses the morning nudge once a real qualifying activity was recorded today', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)
    await settingsRepo.update({
      reminders: { ...REMINDERS_OFF, morningNudge: { enabled: true, time: '00:00' } },
    })
    const repos = createRepositories(db)
    await repos.transactions.create({
      type: 'income',
      amountMinorUnits: 1000,
      currency: 'ETB',
      date: new Date().toISOString().slice(0, 10),
      categoryId: 'cat-1',
      tags: [],
    })

    await scheduler.catchUp()

    const all = await notificationsRepo.list()
    expect(all.find((n) => n.type === 'morning-nudge')).toBeUndefined()
  })
})

describe('createWebScheduler.sendTest', () => {
  let db: DowiDatabase
  let scheduler: ReminderScheduler
  let notificationsRepo: ReturnType<typeof createNotificationsRepo>

  beforeEach(() => {
    db = createTestDb()
    const settingsRepo = createSettingsRepo(db)
    notificationsRepo = createNotificationsRepo(db)
    const repos = createRepositories(db)
    scheduler = createWebScheduler({ db, settingsRepo, notificationsRepo, repos })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.delete()
  })

  it('requests permission in context when not yet decided, then delivers', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('default')
    vi.mocked(permission.requestNotificationPermission).mockResolvedValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)

    const result = await scheduler.sendTest()

    expect(permission.requestNotificationPermission).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ delivered: true, permission: 'granted' })
  })

  it('does not deliver or touch the inbox when permission is denied', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('denied')

    const result = await scheduler.sendTest()

    expect(result).toEqual({ delivered: false, permission: 'denied' })
    expect(deliver.showOsNotification).not.toHaveBeenCalled()
    expect(await notificationsRepo.list()).toHaveLength(0)
  })

  it('does not re-request permission when already granted', async () => {
    vi.mocked(permission.getNotificationPermission).mockReturnValue('granted')
    vi.mocked(deliver.showOsNotification).mockResolvedValue(true)

    await scheduler.sendTest()

    expect(permission.requestNotificationPermission).not.toHaveBeenCalled()
  })
})
