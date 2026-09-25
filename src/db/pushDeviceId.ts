import type { DowiDatabase } from './db'

/**
 * A stable per-browser-profile id for the push-wake path (src/notifications/
 * pushSubscription.ts, api/push/). Stored in the same `meta` table as
 * `streak`/`seededAt` (see streakRepo.ts's comment on that precedent)
 * rather than localStorage, specifically so the service worker's own
 * `pushsubscriptionchange` handler (src/sw.ts) — which has no localStorage
 * — reads the exact same id as the page did, instead of accidentally
 * minting a second device entry server-side for the same physical device.
 */
const PUSH_DEVICE_ID_META_KEY = 'pushDeviceId'

export async function getOrCreatePushDeviceId(db: DowiDatabase): Promise<string> {
  const row = await db.meta.get(PUSH_DEVICE_ID_META_KEY)
  if (row?.value) return row.value
  const id = crypto.randomUUID()
  await db.meta.put({ key: PUSH_DEVICE_ID_META_KEY, value: id })
  return id
}
