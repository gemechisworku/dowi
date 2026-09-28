/**
 * A small, self-diagnostic breadcrumb for the one path that otherwise has
 * zero visibility on a real phone: the service worker's `push` handler runs
 * with no console attached and, by design (see sw.ts), swallows any error
 * so a bad wake never surfaces as a broken app. Recording the outcome of
 * every run here — success or failure — turns "did the last background
 * wake actually do anything" into something visible in Settings → About,
 * without needing remote devtools.
 */
import type { DowiDatabase } from '@/db/db'
import type { NotificationPermissionState } from './permission'

const PUSH_DEBUG_META_KEY = 'pushDebug:lastRun'

export interface PushDebugRecord {
  /** ISO 8601 — when this run happened. */
  ranAt: string
  source: 'push' | 'periodicsync'
  /** Absent when `error` is set — the run never got far enough to know. */
  dueCount?: number
  deliveredCount?: number
  permission?: NotificationPermissionState
  quiet?: boolean
  /** Set only if runReminderCatchUp's try/catch actually caught something. */
  error?: string
}

export async function recordPushDebug(db: DowiDatabase, record: PushDebugRecord): Promise<void> {
  try {
    await db.meta.put({ key: PUSH_DEBUG_META_KEY, value: JSON.stringify(record) })
  } catch {
    // Best-effort — losing the breadcrumb itself is never worth surfacing.
  }
}

export async function getLastPushDebug(db: DowiDatabase): Promise<PushDebugRecord | null> {
  const row = await db.meta.get(PUSH_DEBUG_META_KEY)
  if (!row) return null
  try {
    return JSON.parse(row.value) as PushDebugRecord
  } catch {
    return null
  }
}

export { PUSH_DEBUG_META_KEY }
