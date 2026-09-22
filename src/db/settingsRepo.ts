import type { DowiDatabase } from './db'
import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  baseCurrency: 'ETB',
  weekStartsOn: 1, // Monday
  fyStartMonth: 1, // January
  theme: 'system',
  textSize: 'm',
  density: 'comfortable',
  hideAmounts: false,
  reminders: {
    weeklyPlan: { enabled: true, day: 1, time: '08:00' }, // Monday
    weeklyReview: { enabled: true, day: 6, time: '18:00' }, // Saturday
    taskDue: { enabled: true, offsets: [0, 1440] }, // at due time, and 1 day before
    dailyAgenda: { enabled: false, time: '07:30' },
    backupNudge: { enabled: true, intervalDays: 30 },
    morningNudge: { enabled: true, time: '09:00' },
    eveningStreak: { enabled: true, time: '21:00' },
    quietHours: { enabled: true, start: '22:00', end: '07:00' },
  },
}

/** Settings is a single row keyed by the fixed id "settings" — no list/CRUD, just get/update. */
export function createSettingsRepo(db: DowiDatabase) {
  return {
    /**
     * Merges the stored row over `DEFAULT_SETTINGS` (top-level *and*
     * `reminders`) rather than returning it as-is — a settings row
     * persisted before a field existed (e.g. an install from before
     * `morningNudge`/`eveningStreak` were added) genuinely lacks that key
     * in IndexedDB, and every new-field addition since M9's `density` has
     * relied on exactly this being handled once here, not re-derived at
     * every call site that reads `settings.reminders.<newKind>.enabled`.
     */
    async get(): Promise<Settings> {
      const existing = await db.settings.get('settings')
      if (!existing) return DEFAULT_SETTINGS
      return {
        ...DEFAULT_SETTINGS,
        ...existing,
        reminders: { ...DEFAULT_SETTINGS.reminders, ...existing.reminders },
      }
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
