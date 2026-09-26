import type { DowiDatabase } from './db'
import { newId } from '@/lib/id'
import type { AppNotification } from './types'

type CreateInput = Omit<AppNotification, 'id' | 'createdAt' | 'read'>

/** Cleared rows older than this are safe to actually drop — dedup (computeDueReminders' catch-up window) never looks back further than a few days anyway. */
const CLEARED_PRUNE_AGE_MS = 90 * 24 * 60 * 60 * 1000

/**
 * "Clearing" a notification (or all of them) hides it from the inbox but
 * deliberately doesn't delete the row — computeDueReminders/computeDueRecurring
 * (src/lib/reminders.ts, src/lib/recurrence.ts) dedup against every
 * notification ever raised, keyed on (type, scheduledFor, deepLink). A real
 * delete used to mean clearing (or reading) a reminder made its occurrence
 * look "never sent" again, so it would silently come back as a brand new,
 * unread notification the next time reminders were recomputed — exactly the
 * "I already read this, why did it come back" bug this fixes.
 */
export function createNotificationsRepo(db: DowiDatabase) {
  return {
    /** Visible inbox rows — excludes cleared ones. What every screen except the scheduler should use. */
    async list(): Promise<AppNotification[]> {
      const all = await db.notifications.orderBy('scheduledFor').reverse().toArray()
      return all.filter((n) => !n.clearedAt)
    },

    async listUnread(): Promise<AppNotification[]> {
      const all = await this.list()
      return all.filter((n) => !n.read)
    },

    /**
     * Every notification ever raised, cleared or not — the scheduler's own
     * dedup needs to see cleared occurrences too, or it would re-raise them.
     * Not used by any inbox-facing screen.
     */
    async listAllEverRaised(): Promise<AppNotification[]> {
      return db.notifications.toArray()
    },

    async create(input: CreateInput): Promise<AppNotification> {
      const record: AppNotification = {
        ...input,
        id: newId(),
        read: false,
        createdAt: new Date().toISOString(),
      }
      await db.notifications.add(record)
      return record
    },

    async markRead(id: string): Promise<void> {
      await db.notifications.update(id, { read: true })
    },

    async markDelivered(id: string): Promise<void> {
      await db.notifications.update(id, { deliveredAt: new Date().toISOString() })
    },

    async markAllRead(): Promise<void> {
      const unread = await this.listUnread()
      await db.notifications.bulkUpdate(unread.map((n) => ({ key: n.id, changes: { read: true } })))
    },

    async clear(id: string): Promise<void> {
      await db.notifications.update(id, { clearedAt: new Date().toISOString() })
      await pruneOldCleared(db)
    },

    async clearAll(): Promise<void> {
      const visible = await this.list()
      const clearedAt = new Date().toISOString()
      await db.notifications.bulkUpdate(visible.map((n) => ({ key: n.id, changes: { clearedAt } })))
      await pruneOldCleared(db)
    },
  }
}

/** Bounds table growth — a cleared row this old can never affect a live dedup check again (catch-up windows are a few days, not months). */
async function pruneOldCleared(db: DowiDatabase): Promise<void> {
  const cutoff = new Date(Date.now() - CLEARED_PRUNE_AGE_MS).toISOString()
  const stale = await db.notifications
    .filter((n) => Boolean(n.clearedAt) && n.clearedAt! < cutoff)
    .primaryKeys()
  if (stale.length > 0) await db.notifications.bulkDelete(stale)
}

export type NotificationsRepo = ReturnType<typeof createNotificationsRepo>
