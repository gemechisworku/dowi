import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createSettingsRepo, DEFAULT_SETTINGS, type SettingsRepo } from '../settingsRepo'
import type { DowiDatabase } from '../db'

describe('settingsRepo', () => {
  let db: DowiDatabase
  let settingsRepo: SettingsRepo

  beforeEach(() => {
    db = createTestDb()
    settingsRepo = createSettingsRepo(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('returns the defaults when nothing has been saved yet', async () => {
    expect(await settingsRepo.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('defaults match the resolved product decisions (ETB, January FY, Monday week)', async () => {
    const settings = await settingsRepo.get()
    expect(settings.baseCurrency).toBe('ETB')
    expect(settings.fyStartMonth).toBe(1)
    expect(settings.weekStartsOn).toBe(1)
  })

  it('update() merges a partial patch and persists it', async () => {
    await settingsRepo.update({ baseCurrency: 'USD' })
    const settings = await settingsRepo.get()
    expect(settings.baseCurrency).toBe('USD')
    expect(settings.weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn) // untouched
  })

  it('update() can merge a nested reminders patch by replacing the whole object', async () => {
    const currentReminders = (await settingsRepo.get()).reminders
    await settingsRepo.update({
      reminders: { ...currentReminders, weeklyPlan: { enabled: false, day: 1, time: '09:00' } },
    })
    const settings = await settingsRepo.get()
    expect(settings.reminders.weeklyPlan).toEqual({ enabled: false, day: 1, time: '09:00' })
    expect(settings.reminders.weeklyReview).toEqual(DEFAULT_SETTINGS.reminders.weeklyReview)
  })

  it('reset() restores the defaults', async () => {
    await settingsRepo.update({ baseCurrency: 'GBP', theme: 'dark' })
    await settingsRepo.reset()
    expect(await settingsRepo.get()).toEqual(DEFAULT_SETTINGS)
  })
})
