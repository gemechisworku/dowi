/**
 * Actually shows an OS notification via the service worker registration
 * (required on Android Chrome — `new Notification()` directly from a page
 * is unsupported there). Best-effort: never throws, never hangs — if the
 * service worker isn't ready within a couple of seconds (e.g. the dev
 * server, which doesn't register one at all), delivery is just skipped and
 * the caller falls back to the in-app inbox only.
 */

const READY_TIMEOUT_MS = 3000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export interface ShowOsNotificationOptions {
  body: string
  /** Distinct per logical notification so a repeat delivery replaces rather than stacks. */
  tag: string
  deepLink?: string
}

/** Returns whether the OS notification was actually shown. */
export async function showOsNotification(
  title: string,
  { body, tag, deepLink }: ShowOsNotificationOptions,
): Promise<boolean> {
  // Inside the service worker's own scope (the periodicsync handler),
  // there's no `document` and no `navigator.serviceWorker` — `self.registration`
  // is the direct way to show a notification there. Checked via a cast
  // rather than `typeof window` so this file type-checks under the
  // service worker's separate (webworker-only) tsconfig too.
  const isServiceWorkerScope = !('document' in (self as unknown as Record<string, unknown>))
  if (isServiceWorkerScope) {
    try {
      // Typed minimally here rather than via the `webworker` lib, which
      // this app-facing tsconfig doesn't include (it would also declare a
      // conflicting global `self: WorkerGlobalScope`).
      const registration = (self as unknown as { registration: ServiceWorkerRegistration })
        .registration
      await registration.showNotification(title, { body, tag, data: { deepLink } })
      return true
    } catch {
      return false
    }
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  try {
    const registration = await withTimeout(navigator.serviceWorker.ready, READY_TIMEOUT_MS)
    await registration.showNotification(title, { body, tag, data: { deepLink } })
    return true
  } catch {
    return false
  }
}
