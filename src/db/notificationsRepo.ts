import type { DowiDatabase } from './db'
import { newId } from '@/lib/id'
import type { AppNotification } from './types'

type CreateInput = Omit<AppNotification, 'id' | 'createdAt' | 'read'>

/**
 * Notifications aren't soft-deletable (there's no "trash" for the inbox —
 * PRD §5.7 just wants mark-read/clear), so this is a smaller, purpose-built
 * repo rather than createSoftDeleteRepo.
 */
export function createNotificationsRepo(db: DowiDatabase) {
  return {
    async list(): Promise<AppNotification[]> {
      return db.notifications.orderBy('scheduledFor').reverse().toArray()
    },

    async listUnread(): Promise<AppNotification[]> {
      const all = await this.list()
      return all.filter((n) => !n.read)
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

    async markAllRead(): Promise<void> {
      const unread = await this.listUnread()
      await db.notifications.bulkUpdate(unread.map((n) => ({ key: n.id, changes: { read: true } })))
    },

    async clear(id: string): Promise<void> {
      await db.notifications.delete(id)
    },

    async clearAll(): Promise<void> {
      await db.notifications.clear()
    },
  }
}

export type NotificationsRepo = ReturnType<typeof createNotificationsRepo>
