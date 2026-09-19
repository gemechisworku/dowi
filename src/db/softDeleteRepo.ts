import type { Table } from 'dexie'
import { newId } from '@/lib/id'
import type { BaseEntity } from './types'

export interface SoftDeleteRepo<T extends BaseEntity, CreateInput> {
  /** All non-deleted records. */
  list(): Promise<T[]>
  /** Soft-deleted records (the Trash view). */
  listTrashed(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  create(input: CreateInput): Promise<T>
  update(id: string, patch: Partial<CreateInput>): Promise<T>
  /** Soft delete — sets deletedAt. Reversible via restore(). */
  remove(id: string): Promise<void>
  restore(id: string): Promise<void>
  /** Permanently removes the record. Used for trash purge and full erase. */
  hardDelete(id: string): Promise<void>
}

/**
 * Builds the CRUD + soft-delete repository shared by every list-based
 * entity (categories, sources, accounts, notes, tasks, ...). Kept generic
 * so each entity's own repository file only has to add what's specific to
 * it (see e.g. transactions.ts's date-range filters).
 */
export function createSoftDeleteRepo<T extends BaseEntity, CreateInput extends object>(
  table: Table<T, string>,
): SoftDeleteRepo<T, CreateInput> {
  return {
    async list() {
      return table.filter((row) => !row.deletedAt).toArray()
    },

    async listTrashed() {
      return table.filter((row) => Boolean(row.deletedAt)).toArray()
    },

    async get(id) {
      return table.get(id)
    },

    async create(input) {
      const now = new Date().toISOString()
      const record = { ...input, id: newId(), createdAt: now, updatedAt: now } as unknown as T
      await table.add(record)
      return record
    },

    async update(id, patch) {
      const existing = await table.get(id)
      if (!existing) throw new Error(`Cannot update: no record with id "${id}"`)
      const updated: T = { ...existing, ...patch, updatedAt: new Date().toISOString() }
      await table.put(updated)
      return updated
    },

    async remove(id) {
      const existing = await table.get(id)
      if (!existing) return
      await table.put({ ...existing, deletedAt: new Date().toISOString() })
    },

    async restore(id) {
      const existing = await table.get(id)
      if (!existing) return
      const restored = { ...existing }
      delete restored.deletedAt
      await table.put(restored)
    },

    async hardDelete(id) {
      await table.delete(id)
    },
  }
}
