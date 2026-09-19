import type { DowiDatabase } from './db'
import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  baseCurrency: 'ETB',
  weekStartsOn: 1, // Monday
  fyStartMonth: 1, // January
  theme: 'system',
  textSize: 'm',
  hideAmounts: false,
  reminders: {
    weeklyPlan: { enabled: true, day: 1, time: '08:00' }, // Monday
    weeklyReview: { enabled: true, day: 6, time: '18:00' }, // Saturday
    taskDue: { enabled: true, offsets: [0, 1440] }, // at due time, and 1 day before
    dailyAgenda: { enabled: false, time: '07:30' },
    backupNudge: { enabled: true, intervalDays: 30 },
    quietHours: { enabled: true, start: '22:00', end: '07:00' },
  },
}

/** Settings is a single row keyed by the fixed id "settings" — no list/CRUD, just get/update. */
export function createSettingsRepo(db: DowiDatabase) {
  return {
    async get(): Promise<Settings> {
      const existing = await db.settings.get('settings')
      return existing ?? DEFAULT_SETTINGS
    },

    async update(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
      const current = await this.get()
      const updated: Settings = { ...current, ...patch, id: 'settings' }
      await db.settings.put(updated)
      return updated
    },

    async reset(): Promise<Settings> {
      await db.settings.put(DEFAULT_SETTINGS)
      return DEFAULT_SETTINGS
    },
  }
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>
