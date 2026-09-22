import { TABLE_KEYS, type BackupData } from '@/db/backup'

export interface ImportPreviewRow {
  key: (typeof TABLE_KEYS)[number]
  label: string
  count: number
}

const LABELS: Record<(typeof TABLE_KEYS)[number], string> = {
  transactions: 'Transactions',
  categories: 'Categories',
  sources: 'Sources',
  accounts: 'Accounts',
  rates: 'Exchange rates',
  notes: 'Notes',
  noteCollections: 'Note collections',
  tasks: 'Tasks',
  taskCollections: 'Task collections',
  notifications: 'Notifications',
  meta: 'App metadata',
}

/**
 * "A preview of what will change before confirming" (PRD §5.8, AC-S2) —
 * purely a UI-layer read of a file already parsed and structurally
 * validated (`validateBackup`), not a new backend function: the row counts
 * are just each table's array length in the parsed file (docs/PLAN.md's M2
 * note says the underlying counts are already there). This does not diff
 * against what's currently in the database — for `replace` mode every
 * existing row is gone regardless of the file's contents, and for `merge`
 * mode a row already present is simply overwritten by id, so "how many rows
 * are in the file" is the number that actually matters to a user deciding
 * whether to go ahead.
 */
export function computeImportPreview(data: BackupData): ImportPreviewRow[] {
  return TABLE_KEYS.map((key) => ({ key, label: LABELS[key], count: data[key].length }))
}

/** Total row count across every table, for a one-line summary above the per-table breakdown. */
export function totalImportRows(rows: ImportPreviewRow[]): number {
  return rows.reduce((sum, row) => sum + row.count, 0)
}
