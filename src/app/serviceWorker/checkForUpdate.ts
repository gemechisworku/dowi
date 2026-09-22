export type UpdateCheckResult = 'update-found' | 'up-to-date' | 'unsupported'

/**
 * A manual "check for update" (Settings → About, PRD §5.8) — calls the
 * existing service worker registration's own `.update()` and reports
 * whether a new one was found. Deliberately narrow: it does not act on
 * what it finds itself (no auto-reload) — it only answers "is there a
 * newer version right now", for a snackbar to report. The passive
 * always-on version of this (detect a new worker without being asked,
 * prompt with a Reload action) is `src/app/pwa/UpdatePrompt.tsx` — the two
 * are complementary, not overlapping: this is "check now, on demand",
 * that one is "tell me the moment you notice, unprompted".
 */
export async function checkForServiceWorkerUpdate(timeoutMs = 4000): Promise<UpdateCheckResult> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported'

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return 'unsupported'

  return new Promise<UpdateCheckResult>((resolve) => {
    let settled = false
    function settle(result: UpdateCheckResult) {
      if (settled) return
      settled = true
      registration?.removeEventListener('updatefound', onUpdateFound)
      resolve(result)
    }
    function onUpdateFound() {
      settle('update-found')
    }

    registration.addEventListener('updatefound', onUpdateFound)
    registration.update().catch(() => settle('unsupported'))
    setTimeout(() => settle('up-to-date'), timeoutMs)
  })
}
