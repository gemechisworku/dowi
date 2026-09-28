/**
 * A rolling, self-diagnostic log for the one path that otherwise has zero
 * visibility on a real phone: the service worker's `push` handler runs with
 * no console attached and, by design (see sw.ts), swallows any error so a
 * bad wake never surfaces as a broken app. Recording every run here —
 * success or failure — turns "what has actually happened on background
 * wakes recently" into something visible in Settings → About, without
 * needing remote devtools.
 */
import type { DowiDatabase } from '@/db/db'
import type { NotificationPermissionState } from './permission'

const PUSH_DEBUG_META_KEY = 'pushDebug:log'
const MAX_ENTRIES = 20

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

/** Appends to a capped, newest-first log rather than overwriting a single value — one bad run shouldn't erase the pattern of runs around it. */
export async function recordPushDebug(db: DowiDatabase, record: PushDebugRecord): Promise<void> {
  try {
    const existing = await getPushDebugLog(db)
    const next = [record, ...existing].slice(0, MAX_ENTRIES)
    await db.meta.put({ key: PUSH_DEBUG_META_KEY, value: JSON.stringify(next) })
  } catch {
    // Best-effort — losing the log entry itself is never worth surfacing.
  }
}

/** Newest-first. Empty when no background wake has ever run. */
export async function getPushDebugLog(db: DowiDatabase): Promise<PushDebugRecord[]> {
  const row = await db.meta.get(PUSH_DEBUG_META_KEY)
  if (!row) return []
  try {
    const parsed = JSON.parse(row.value) as unknown
    return Array.isArray(parsed) ? (parsed as PushDebugRecord[]) : []
  } catch {
    return []
  }
}

export { PUSH_DEBUG_META_KEY }
