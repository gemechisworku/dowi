/// <reference lib="webworker" />

/**
 * A custom service worker (`injectManifest` strategy — see vite.config.ts)
 * rather than vite-plugin-pwa's default `generateSW`, because M7 needs two
 * event handlers `generateSW` has no hook for: `notificationclick` (deep
 * link a tapped reminder to the right screen) and `periodicsync`
 * (best-effort catch-up while the app is closed, PRD OD-1). Precaching is
 * still Workbox, just wired up by hand here instead of generated whole.
 */

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>
}

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// injectManifest (unlike generateSW) doesn't add SPA navigation fallback
// for free — without this, a hard reload on a deep route (e.g. /tasks/plan)
// would 404 offline instead of falling back to the precached shell.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }),
)

interface NotificationData {
  deepLink?: string
}

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const deepLink = (event.notification.data as NotificationData | undefined)?.deepLink ?? '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const focusable = allClients.find((c): c is WindowClient => 'focus' in c)
      if (focusable) {
        await focusable.focus()
        focusable.postMessage({ type: 'dowi:navigate', path: deepLink })
      } else {
        await self.clients.openWindow(deepLink)
      }
    })(),
  )
})

const REMINDERS_SYNC_TAG = 'dowi-reminders-catchup'

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string
}

// PeriodicSyncEvent isn't yet part of TypeScript's built-in webworker lib,
// hence the cast — the listener itself is genuinely supported (Chrome-only).
const swScope = self as unknown as {
  addEventListener(type: 'periodicsync', listener: (event: PeriodicSyncEvent) => void): void
}

/**
 * Periodic Background Sync is Chrome-only and requires the PWA to already
 * be installed with high site-engagement — it will simply never fire on
 * most platforms. That's fine: it's a bonus path on top of the reliable
 * catch-up-on-open flow (App.tsx), not a replacement for it.
 */
swScope.addEventListener('periodicsync', (event) => {
  if (event.tag !== REMINDERS_SYNC_TAG) return
  event.waitUntil(runReminderCatchUp())
})

async function runReminderCatchUp(): Promise<void> {
  try {
    const [
      { createDatabase },
      { createSettingsRepo },
      { createNotificationsRepo },
      { createRepositories },
      { createWebScheduler },
    ] = await Promise.all([
      import('./db/db'),
      import('./db/settingsRepo'),
      import('./db/notificationsRepo'),
      import('./db/repositories'),
      import('./notifications/scheduler'),
    ])
    const db = createDatabase()
    const scheduler = createWebScheduler({
      db,
      settingsRepo: createSettingsRepo(db),
      notificationsRepo: createNotificationsRepo(db),
      tasksRepo: createRepositories(db).tasks,
    })
    await scheduler.catchUp()
  } catch {
    // Best-effort — a failure here just means the user sees the same
    // reminders as an ordinary catch-up next time they open the app.
  }
}

export { REMINDERS_SYNC_TAG }
