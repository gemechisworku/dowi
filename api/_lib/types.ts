/**
 * Deliberately duplicated from src/notifications/pushRules.ts's own
 * `SyncedReminderRules`/`SyncedDailyRule`/`SyncedWeeklyRule` rather than
 * imported: Vercel's own build step type-checks api/**\/*.ts under strict
 * Node ESM resolution (package.json's `"type": "module"`), which doesn't
 * reliably follow this repo's `@/*` path alias the way our local tsconfig
 * does — this file has to stand on its own. The shape is small and stable;
 * keep the two in sync if it ever changes.
 */
export interface SyncedDailyRule {
  enabled: boolean
  time: string
}

export interface SyncedWeeklyRule {
  enabled: boolean
  day: number
  time: string
}

export interface SyncedReminderRules {
  morningNudge: SyncedDailyRule
  eveningStreak: SyncedDailyRule
  dailyAgenda: SyncedDailyRule
  weeklyPlan: SyncedWeeklyRule
  weeklyReview: SyncedWeeklyRule
  quietHours: { enabled: boolean; start: string; end: string }
  taskDueAt: string[]
}

export interface PushSubscriptionJson {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

export interface PushDeviceEntry {
  subscription: PushSubscriptionJson
  /** IANA timezone, e.g. "Africa/Addis_Ababa" — how rule times are interpreted. */
  timeZone: string
  rules: SyncedReminderRules
  /**
   * What's already been sent, so the sweep doesn't re-wake the device (and
   * spend its Web Push "must show a notification" budget) for the same
   * occurrence on every tick while it's still within tolerance. Daily rules
   * key off "YYYY-MM-DD", weekly rules off "YYYY-Www", task-due off the
   * exact fired instant.
   */
  lastFired: {
    morningNudge?: string
    eveningStreak?: string
    dailyAgenda?: string
    weeklyPlan?: string
    weeklyReview?: string
    taskDueAt?: string[]
  }
  updatedAt: string
}

/** Keyed by a client-generated device id (src/notifications/pushSubscription.ts). */
export type PushDevices = Record<string, PushDeviceEntry>
