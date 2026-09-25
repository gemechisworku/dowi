/**
 * Client side of the push-wake path (see api/push/ and src/notifications/pushRules.ts
 * for the server/shared pieces). Subscribes to Web Push once notification
 * permission is granted, and keeps the server's copy of the scheduling
 * rules (never content) in sync — called from useNotificationRuntime.ts (on
 * app open), SettingsPage.tsx (after a reminder-settings change) and
 * TaskSheet.tsx (after a task's due date/reminders change).
 */

import type { DowiDatabase } from '@/db/db'
import type { Repositories } from '@/db/repositories'
import type { SettingsRepo } from '@/db/settingsRepo'
import { getOrCreatePushDeviceId } from '@/db/pushDeviceId'
import { buildSyncedReminderRules } from './pushRules'

const LAST_SYNCED_KEY = 'dowi:push:lastSyncedPayload'

/** VAPID public keys are base64url; PushManager wants a raw Uint8Array. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Backed by an explicit `new ArrayBuffer(...)` rather than
  // `new Uint8Array(length)` or `Uint8Array.from(...)` — TS 5.7+'s
  // Uint8Array is generic over its backing buffer, and both of those
  // infer the wider `ArrayBufferLike`, not assignable to
  // PushSubscriptionOptionsInit's `applicationServerKey: BufferSource`.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function isPushSupported(): boolean {
  return (
    __VAPID_PUBLIC_KEY__.length > 0 &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

/** Existing subscription if there is one, or a fresh one — null if unsupported or permission isn't granted. */
export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || Notification.permission !== 'granted') return null
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(__VAPID_PUBLIC_KEY__),
    })
  } catch {
    // Best-effort — push is a bonus delivery path on top of catch-up-on-open.
    return null
  }
}

interface SyncDeps {
  db: DowiDatabase
  settingsRepo: SettingsRepo
  repos: Pick<Repositories, 'tasks'>
}

/**
 * Subscribes if needed, then POSTs the current rules if they've actually
 * changed since the last successful sync (a plain string-equality check
 * against the last payload, persisted so it survives a reload) — keeps
 * writes to the server's storage rare, since it only has a small free
 * write budget and doesn't need to hear about no-op resyncs.
 */
export async function syncPushRules({ db, settingsRepo, repos }: SyncDeps): Promise<void> {
  const subscription = await ensurePushSubscription()
  if (!subscription) return

  const [settings, tasks, deviceId] = await Promise.all([
    settingsRepo.get(),
    repos.tasks.list(),
    getOrCreatePushDeviceId(db),
  ])
  const rules = buildSyncedReminderRules(settings, tasks)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const payload = { deviceId, subscription: subscription.toJSON(), timeZone, rules }
  const serialized = JSON.stringify(payload)

  let lastSynced: string | null = null
  try {
    lastSynced = localStorage.getItem(LAST_SYNCED_KEY)
  } catch {
    // fall through — worst case this re-syncs every time, which is still correct
  }
  if (lastSynced === serialized) return

  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    })
    if (!res.ok) return
    localStorage.setItem(LAST_SYNCED_KEY, serialized)
  } catch {
    // Offline or the API route isn't configured yet — fine, next sync point retries.
  }
}
