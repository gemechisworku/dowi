/**
 * Best-effort request that the browser not silently evict this origin's
 * IndexedDB under storage pressure (PRD D2 mitigation). Not supported in
 * every browser/context — always resolves rather than throwing either way.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator) || !navigator.storage.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface StorageUsage {
  usageBytes: number | null
  quotaBytes: number | null
  persisted: boolean | null
}

/** Reports how much of the origin's storage quota is used, for Settings → Data. */
export async function getStorageUsage(): Promise<StorageUsage> {
  let usageBytes: number | null = null
  let quotaBytes: number | null = null
  let persisted: boolean | null = null

  if ('storage' in navigator) {
    if (navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        usageBytes = estimate.usage ?? null
        quotaBytes = estimate.quota ?? null
      } catch {
        // leave as null — the UI shows "unknown" rather than failing
      }
    }
    if (navigator.storage.persisted) {
      try {
        persisted = await navigator.storage.persisted()
      } catch {
        persisted = null
      }
    }
  }

  return { usageBytes, quotaBytes, persisted }
}
