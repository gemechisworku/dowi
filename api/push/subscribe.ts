import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPushDevices, writePushDevices } from '../_lib/edgeConfig'
import type {
  PushDeviceEntry,
  PushDevices,
  PushSubscriptionJson,
  SyncedReminderRules,
} from '../_lib/types'

/**
 * Called by the app itself (src/notifications/pushSubscription.ts) whenever
 * its push subscription or scheduling rules change. Deliberately
 * unauthenticated beyond basic shape validation: this is a personal,
 * single-user app with no accounts, the payload never contains financial
 * or task content (only a push subscription + recurring time-of-day
 * rules), and writePushDevices caps the stored device count regardless —
 * a determined bad actor could add a bogus device entry, not read or
 * affect the real user's data.
 */

interface SubscribeBody {
  deviceId: string
  subscription: PushSubscriptionJson
  timeZone: string
  rules: SyncedReminderRules
}

const MAX_TASK_DUE_ENTRIES = 100

function isValidSubscription(value: unknown): value is PushSubscriptionJson {
  if (!value || typeof value !== 'object') return false
  const sub = value as Record<string, unknown>
  if (typeof sub.endpoint !== 'string' || sub.endpoint.length === 0) return false
  const keys = sub.keys as Record<string, unknown> | undefined
  return Boolean(keys && typeof keys.p256dh === 'string' && typeof keys.auth === 'string')
}

function isValidBody(value: unknown): value is SubscribeBody {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  if (
    typeof body.deviceId !== 'string' ||
    body.deviceId.length === 0 ||
    body.deviceId.length > 100
  ) {
    return false
  }
  if (
    typeof body.timeZone !== 'string' ||
    body.timeZone.length === 0 ||
    body.timeZone.length > 100
  ) {
    return false
  }
  if (!isValidSubscription(body.subscription)) return false
  const rules = body.rules as Record<string, unknown> | undefined
  if (!rules || !Array.isArray(rules.taskDueAt) || rules.taskDueAt.length > MAX_TASK_DUE_ENTRIES) {
    return false
  }
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'Invalid subscription payload' })
    return
  }

  const devices: PushDevices = await getPushDevices()
  const existing = devices[req.body.deviceId]
  const entry: PushDeviceEntry = {
    subscription: req.body.subscription,
    timeZone: req.body.timeZone,
    rules: req.body.rules,
    // A settings/task change shouldn't re-arm something already sent today.
    lastFired: existing?.lastFired ?? {},
    updatedAt: new Date().toISOString(),
  }

  await writePushDevices({ ...devices, [req.body.deviceId]: entry })
  res.status(200).json({ ok: true })
}
