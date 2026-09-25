import type { IncomingHttpHeaders } from 'node:http'

/**
 * Protects /api/push/sweep — only cron-job.org (configured with this same
 * value as a custom request header) should ever be able to trigger it.
 * Not used on /api/push/subscribe, which the app's own client calls
 * directly; see that route's own comment for why an unauthenticated write
 * there is an accepted trade-off for a single-user app.
 */
export function isAuthorizedCronRequest(headers: IncomingHttpHeaders): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const provided = headers['x-cron-secret']
  return typeof provided === 'string' && provided === expected
}
