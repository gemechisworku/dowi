import webpush, { WebPushError } from 'web-push'
import type { PushSubscriptionJson } from './types.js'

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
    // urgency: 'high' — without it, Android/Chrome can silently defer or
    // drop a "normal"-priority push while the device is idle/in Doze,
    // which looks from the outside exactly like "the push was never sent"
    // even though the server-side send itself succeeds. A short TTL means
    // a wake that couldn't be delivered promptly (device offline) is
    // dropped rather than arriving stale much later.
    const result = await webpush.sendNotification(subscription, undefined, {
      urgency: 'high',
      TTL: 300,
    })
    // Logging the actual statusCode/body the push service returned, not
    // just "it didn't throw" — a prior debugging round inferred success
    // only from indirect evidence (this call plus a follow-up write both
    // happening), never the literal response, which turned out to be a
    // real gap worth closing.
    console.log('[push] sendWakePush ok', {
      endpoint: subscription.endpoint,
      statusCode: result.statusCode,
      body: result.body,
    })
    return { ok: true, gone: false }
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      console.warn('[push] sendWakePush: subscription gone', {
        endpoint: subscription.endpoint,
        statusCode: error.statusCode,
        body: error.body,
      })
      return { ok: false, gone: true }
    }
    // This branch is the one most worth watching for: a bad VAPID keypair,
    // an unreachable push service, or a malformed subscription all land
    // here, silently, unless logged — surfaced as `ok: false, gone: false`
    // to the caller either way, so sweep.ts doesn't retry a device this
    // never explicitly took offline.
    console.error('[push] sendWakePush failed', {
      endpoint: subscription.endpoint,
      statusCode: error instanceof WebPushError ? error.statusCode : undefined,
      body: error instanceof WebPushError ? error.body : undefined,
      message: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, gone: false }
  }
}
