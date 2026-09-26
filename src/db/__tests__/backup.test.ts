import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from './testDb'
import { createRepositories, type Repositories } from '../repositories'
import { createSettingsRepo } from '../settingsRepo'
import { seedIfNeeded } from '../seed'
import {
  BackupValidationError,
  exportAll,
  importAll,
  validateBackup,
  BACKUP_FORMAT_VERSION,
} from '../backup'
import type { DowiDatabase } from '../db'

async function fullExport(db: DowiDatabase) {
  return exportAll(db)
}

describe('exportAll / importAll round trip', () => {
  let db: DowiDatabase
  let repos: Repositories

  beforeEach(async () => {
    db = createTestDb()
    repos = createRepositories(db)
    await seedIfNeeded(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('round-trips every table exactly through export -> erase -> import (replace)', async () => {
    const category = await repos.categories.create({
      name: 'Groceries',
      icon: '🛒',
      color: '#000',
      type: 'expense',
    })
    await repos.transactions.create({
      type: 'expense',
      amountMinorUnits: 5000,
      currency: 'ETB',
      date: '2026-09-19',
      categoryId: category.id,
      tags: ['weekly'],
      note: 'Groceries run',
    })
    await repos.notes.create({
      title: 'Q4 planning',
      contentJSON: { type: 'doc', content: [] },
      contentText: 'Three things to fix',
      tags: [],
      pinned: true,
    })
    const settingsRepo = createSettingsRepo(db)
    await settingsRepo.update({ baseCurrency: 'USD', hideAmounts: true })

    const before = await fullExport(db)

    // Erase everything, exactly as Settings → Erase all would.
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.sources.clear(),
      db.accounts.clear(),
      db.rates.clear(),
      db.notes.clear(),
      db.noteCollections.clear(),
      db.tasks.clear(),
      db.taskCollections.clear(),
      db.notifications.clear(),
      db.settings.clear(),
      db.meta.clear(),
    ])
    expect(await repos.categories.list()).toHaveLength(0)

    await importAll(db, before, 'replace')
    const after = await fullExport(db)

    // exportedAt legitimately differs between the two exports; everything else must not.
    expect({ ...after, exportedAt: null }).toEqual({ ...before, exportedAt: null })
  })

  it('replace mode removes records that only exist in the live database, not in the imported file', async () => {
    // Snapshot the database first, *then* add a category live — a `replace`
    // import of that snapshot must remove the category added afterward.
    const baseline = await fullExport(db)
    const addedAfterSnapshot = await repos.categories.create({
      name: 'Added after the snapshot',
      icon: '❌',
      color: '#000',
      type: 'expense',
    })

    await importAll(db, baseline, 'replace')

    const finalCategories = await repos.categories.list()
    expect(finalCategories.map((c) => c.id)).not.toContain(addedAfterSnapshot.id)
    expect(finalCategories).toHaveLength(baseline.categories.filter((c) => !c.deletedAt).length)
  })

  it('merge mode adds/overwrites by id but leaves untouched records alone', async () => {
    const untouched = await repos.categories.create({
      name: 'Kept as-is',
      icon: '✅',
      color: '#000',
      type: 'expense',
    })
    const toOverwrite = await repos.categories.create({
      name: 'Original name',
      icon: '📦',
      color: '#000',
      type: 'expense',
    })

    const backup = await fullExport(db)
    const modifiedCategory = backup.categories.find((c) => c.id === toOverwrite.id)!
    modifiedCategory.name = 'Renamed via import'
    backup.categories = backup.categories.filter((c) => c.id !== untouched.id) // pretend it never existed in the file

    await importAll(db, backup, 'merge')

    const stillThere = await repos.categories.get(untouched.id)
    expect(stillThere?.name).toBe('Kept as-is') // untouched, not deleted by merge

    const overwritten = await repos.categories.get(toOverwrite.id)
    expect(overwritten?.name).toBe('Renamed via import')
  })

  it('reports per-table counts in the result', async () => {
    const backup = await fullExport(db)
    const result = await importAll(db, backup, 'replace')
    expect(result.mode).toBe('replace')
    expect(result.counts.categories).toBe(backup.categories.length)
  })

  it('round-trips the activity log (streak calendar history) through export -> erase -> import', async () => {
    await repos.activityLog.record('2026-06-01')
    await repos.activityLog.record('2026-06-01')
    await repos.activityLog.record('2026-06-02')

    const before = await fullExport(db)
    expect(before.activityLog).toEqual(
      expect.arrayContaining([
        { date: '2026-06-01', count: 2 },
        { date: '2026-06-02', count: 1 },
      ]),
    )

    await db.activityLog.clear()
    await importAll(db, before, 'replace')

    const restored = await repos.activityLog.list()
    expect(restored).toHaveLength(2)
  })

  it('imports cleanly a backup made before the activity log existed (activityLog key absent)', async () => {
    const backup = await fullExport(db)
    const legacyBackup = { ...backup } as Partial<typeof backup>
    delete legacyBackup.activityLog

    await expect(importAll(db, legacyBackup, 'replace')).resolves.not.toThrow()
    expect(await repos.activityLog.list()).toHaveLength(0)
  })
})

describe('validateBackup', () => {
  it('accepts a well-formed backup object', () => {
    const valid = {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      transactions: [],
      categories: [],
      sources: [],
      accounts: [],
      rates: [],
      notes: [],
      noteCollections: [],
      tasks: [],
      taskCollections: [],
      notifications: [],
      meta: [],
    }
    expect(() => validateBackup(valid)).not.toThrow()
  })

  it('rejects null/non-object input', () => {
    expect(() => validateBackup(null)).toThrow(BackupValidationError)
    expect(() => validateBackup('a string')).toThrow(BackupValidationError)
    expect(() => validateBackup(42)).toThrow(BackupValidationError)
  })

  it('rejects a file with no formatVersion', () => {
    expect(() => validateBackup({})).toThrow(/format version/i)
  })

  it('rejects a file from a newer, unsupported format version', () => {
    expect(() => validateBackup({ formatVersion: BACKUP_FORMAT_VERSION + 1 })).toThrow(
      /newer version/i,
    )
  })

  it('rejects a file missing one of the required table arrays', () => {
    const missingCategories = {
      formatVersion: BACKUP_FORMAT_VERSION,
      transactions: [],
      // categories missing
      sources: [],
      accounts: [],
      rates: [],
      notes: [],
      noteCollections: [],
      tasks: [],
      taskCollections: [],
      notifications: [],
      meta: [],
    }
    expect(() => validateBackup(missingCategories)).toThrow(/categories/i)
  })

  it('rejects a truncated/corrupt JSON-shaped object gracefully (no data loss risk)', () => {
    expect(() => validateBackup({ formatVersion: 1, categories: 'not-an-array' })).toThrow(
      BackupValidationError,
    )
  })
})

describe('importAll safety', () => {
  let db: DowiDatabase
  let repos: Repositories

  beforeEach(async () => {
    db = createTestDb()
    repos = createRepositories(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('leaves the database untouched when the file fails validation', async () => {
    const existing = await repos.categories.create({
      name: 'Should survive',
      icon: '🛡️',
      color: '#000',
      type: 'expense',
    })

    await expect(importAll(db, { not: 'a backup' }, 'replace')).rejects.toThrow(
      BackupValidationError,
    )

    const stillThere = await repos.categories.get(existing.id)
    expect(stillThere?.name).toBe('Should survive')
  })
})
