import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPushDevices, writePushDevices } from '../_lib/edgeConfig'
import { isDeviceDueNow } from '../_lib/dueCheck'
import { sendWakePush } from '../_lib/webPush'
import { isAuthorizedCronRequest } from '../_lib/auth'
import type { PushDeviceEntry, PushDevices } from '../_lib/types'

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
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const now = new Date()
  const devices = await getPushDevices()
  const updates: PushDevices = {}
  const removed: string[] = []

  for (const [deviceId, entry] of Object.entries(devices)) {
    const { due, firedUpdates } = isDeviceDueNow(entry, now)
    if (!due) continue

    const result = await sendWakePush(entry.subscription)
    if (result.gone) {
      removed.push(deviceId)
      continue
    }
    if (!result.ok) continue

    const merged: PushDeviceEntry['lastFired'] = { ...entry.lastFired, ...firedUpdates }
    merged.taskDueAt = pruneTaskDueHistory(merged.taskDueAt, now)
    updates[deviceId] = { ...entry, lastFired: merged, updatedAt: now.toISOString() }
  }

  if (Object.keys(updates).length > 0 || removed.length > 0) {
    const next: PushDevices = { ...devices, ...updates }
    for (const deviceId of removed) delete next[deviceId]
    await writePushDevices(next)
  }

  res.status(200).json({
    devices: Object.keys(devices).length,
    fired: Object.keys(updates).length,
    removed: removed.length,
  })
}
