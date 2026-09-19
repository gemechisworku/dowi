/**
 * A random id for locally-created records. Uses the Web Crypto API
 * (available in every target browser and in Node 19+ for tests) with a
 * non-cryptographic fallback so the app never hard-fails on an odd
 * embedded WebView that lacks it.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: not cryptographically strong, but fine for a local-only,
  // single-user primary key with no security requirement.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
