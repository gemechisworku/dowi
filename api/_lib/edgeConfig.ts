/**
 * Storage for push subscriptions + their scheduling rules (api/_lib/types.ts).
 * Reads go through @vercel/global-config (fast, generous free-tier read
 * budget — plenty for a per-minute sweep). Writes aren't supported by that
 * SDK at all (Edge Config is built for high reads, rare writes) — they go
 * straight to the Vercel REST API instead, authenticated with a personal
 * access token (VERCEL_API_TOKEN), which only you can create.
 */

import { get } from '@vercel/global-config'
import type { PushDevices } from './types'

const DEVICES_KEY = 'pushDevices'
const MAX_DEVICES = 5

function edgeConfigId(): string {
  const connectionString = process.env.EDGE_CONFIG ?? process.env.GLOBAL_CONFIG
  if (!connectionString) {
    throw new Error(
      'EDGE_CONFIG env var is not set — connect an Edge Config store in Vercel first.',
    )
  }
  // Connection strings look like https://edge-config.vercel.com/ecfg_xxx?token=...
  return new URL(connectionString).pathname.replace(/^\//, '')
}

export async function getPushDevices(): Promise<PushDevices> {
  const value = await get(DEVICES_KEY)
  return (value as PushDevices | undefined) ?? {}
}

/**
 * Replaces the whole device map in one write (Edge Config items are
 * whole-value, not field-level) — still just one write per call regardless
 * of how many devices are in the map. If a device count ever exceeds
 * MAX_DEVICES, the oldest (by updatedAt) is dropped rather than growing
 * unbounded, since this is a personal app with realistically 1-3 devices.
 */
export async function writePushDevices(devices: PushDevices): Promise<void> {
  const entries = Object.entries(devices).sort(
    (a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime(),
  )
  const trimmed = Object.fromEntries(entries.slice(0, MAX_DEVICES))

  const apiToken = process.env.VERCEL_API_TOKEN
  if (!apiToken) {
    throw new Error('VERCEL_API_TOKEN env var is not set — create one in Vercel account settings.')
  }
  const teamId = process.env.VERCEL_TEAM_ID
  const url = new URL(`https://api.vercel.com/v1/edge-config/${edgeConfigId()}/items`)
  if (teamId) url.searchParams.set('teamId', teamId)

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ operation: 'upsert', key: DEVICES_KEY, value: trimmed }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Edge Config write failed: ${res.status} ${await res.text()}`)
  }
}
