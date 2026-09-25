import webpush, { WebPushError } from 'web-push'
import type { PushSubscriptionJson } from './types'

let configured = false

function ensureConfigured(): void {
  if (configured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be set.')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
}

export interface SendWakeResult {
  ok: boolean
  /** The push service says this subscription no longer exists — caller should drop it. */
  gone: boolean
}

/**
 * Sends an empty push — its only job is to wake the device's service
 * worker, which re-runs the real catch-up logic against local IndexedDB to
 * decide what (if anything) to actually show. No payload means no content
 * ever passes through the push service.
 */
export async function sendWakePush(subscription: PushSubscriptionJson): Promise<SendWakeResult> {
  ensureConfigured()
  try {
    await webpush.sendNotification(subscription)
    return { ok: true, gone: false }
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      return { ok: false, gone: true }
    }
    return { ok: false, gone: false }
  }
}
