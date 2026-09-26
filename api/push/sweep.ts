import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPushDevices, writePushDevices } from '../_lib/edgeConfig.js'
import { isDeviceDueNow } from '../_lib/dueCheck.js'
import { sendWakePush } from '../_lib/webPush.js'
import { isAuthorizedCronRequest } from '../_lib/auth.js'
import type { PushDeviceEntry, PushDevices } from '../_lib/types.js'

const TASK_DUE_HISTORY_MS = 14 * 24 * 60 * 60 * 1000

/** Drops fired task-due entries once they're old enough that they'd never match rules.taskDueAt again anyway. */
function pruneTaskDueHistory(taskDueAt: string[] | undefined, now: Date): string[] | undefined {
  if (!taskDueAt || taskDueAt.length === 0) return taskDueAt
  const cutoff = now.getTime() - TASK_DUE_HISTORY_MS
  return taskDueAt.filter((iso) => new Date(iso).getTime() >= cutoff)
}

/**
 * The cron-job.org target (every ~1 min, see api/_lib/auth.ts). Read-only
 * against Edge Config except when something is actually due — so routine
 * ticks cost nothing but a read, comfortably inside Edge Config's free
 * read budget, and writes only happen once per genuine reminder firing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorizedCronRequest(req.headers)) {
    console.warn('[sweep] rejected: missing/incorrect X-Cron-Secret header')
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const now = new Date()
    const devices = await getPushDevices()
    const deviceIds = Object.entries(devices)
    console.log(`[sweep] tick at ${now.toISOString()} — ${deviceIds.length} device(s) on file`)

    const updates: PushDevices = {}
    const removed: string[] = []

    for (const [deviceId, entry] of deviceIds) {
      const { due, firedUpdates } = isDeviceDueNow(entry, now)
      if (!due) continue
      console.log(`[sweep] ${deviceId} is due`, { firedUpdates })

      const result = await sendWakePush(entry.subscription)
      if (result.gone) {
        console.warn(`[sweep] ${deviceId} subscription gone — dropping`)
        removed.push(deviceId)
        continue
      }
      if (!result.ok) {
        console.warn(
          `[sweep] ${deviceId} push send failed — leaving lastFired unchanged, will retry next tick`,
        )
        continue
      }

      const merged: PushDeviceEntry['lastFired'] = { ...entry.lastFired, ...firedUpdates }
      merged.taskDueAt = pruneTaskDueHistory(merged.taskDueAt, now)
      updates[deviceId] = { ...entry, lastFired: merged, updatedAt: now.toISOString() }
    }

    if (Object.keys(updates).length > 0 || removed.length > 0) {
      const next: PushDevices = { ...devices, ...updates }
      for (const deviceId of removed) delete next[deviceId]
      await writePushDevices(next)
    }

    const summary = {
      devices: deviceIds.length,
      fired: Object.keys(updates).length,
      removed: removed.length,
    }
    console.log('[sweep] done', summary)
    res.status(200).json(summary)
  } catch (error) {
    // Most likely cause: EDGE_CONFIG/GLOBAL_CONFIG, VERCEL_API_TOKEN or the
    // VAPID_* env vars aren't set (or aren't set for this environment) —
    // see api/_lib/edgeConfig.ts and api/_lib/webPush.ts's own errors.
    console.error('[sweep] failed', error instanceof Error ? error.message : error)
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
}
