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

// Deliberately NOT calling self.skipWaiting() unconditionally here — that
// would force every new worker to activate (and clientsClaim() below to
// take over every open tab) the instant it finishes installing, regardless
// of registerType: 'prompt' or whether the app ever actually asked. A
// waiting worker only skips waiting in response to the page's own
// "SKIP_WAITING" message below, which is exactly what the update prompt's
// "Reload" action (src/app/pwa/UpdatePrompt.tsx, via vite-plugin-pwa's
// updateServiceWorker()) sends once the user has agreed to it.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
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

/**
 * Injected at build time from the VAPID_PUBLIC_KEY env var (vite.config.ts
 * `define`) — same value the client bundle gets (src/vite-env.d.ts),
 * needed here only to re-subscribe if the push subscription itself
 * expires (rare, but the browser can rotate it — see
 * `pushsubscriptionchange` below).
 */
declare const __VAPID_PUBLIC_KEY__: string

self.addEventListener('push', (event: PushEvent) => {
  // The push payload is deliberately empty (see api/_lib/webPush.ts) — its
  // only job is to wake this handler, which decides everything (content,
  // whether anything's even still due) the exact same way an ordinary
  // catch-up-on-open does, against local IndexedDB. If nothing turns out
  // to be due (e.g. the server's timing tolerance and the client's own
  // catch-up window disagree at the margin), no notification is shown for
  // this push — an accepted, rare trade-off against ever showing a
  // spurious "nothing new" notification (see src/notifications/pushRules.ts).
  event.waitUntil(runReminderCatchUp())
})

self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const changeEvent = event as Event & {
    oldSubscription?: PushSubscription
    newSubscription?: PushSubscription
    waitUntil(promise: Promise<unknown>): void
  }
  changeEvent.waitUntil(resubscribeAndSync())
})

async function resubscribeAndSync(): Promise<void> {
  if (!__VAPID_PUBLIC_KEY__) return
  try {
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(__VAPID_PUBLIC_KEY__),
    })
    const [
      { createDatabase },
      { createSettingsRepo },
      { createRepositories },
      { buildSyncedReminderRules },
      { getOrCreatePushDeviceId },
    ] = await Promise.all([
      import('./db/db'),
      import('./db/settingsRepo'),
      import('./db/repositories'),
      import('./notifications/pushRules'),
      import('./db/pushDeviceId'),
    ])
    const db = createDatabase()
    const repos = createRepositories(db)
    const [settings, tasks, deviceId] = await Promise.all([
      createSettingsRepo(db).get(),
      repos.tasks.list(),
      getOrCreatePushDeviceId(db),
    ])
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        subscription: subscription.toJSON(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        rules: buildSyncedReminderRules(settings, tasks),
      }),
    })
  } catch {
    // Best-effort — worst case this device stops getting woken by push
    // until it's next opened, which re-subscribes via the ordinary
    // catch-up-on-open path (useNotificationRuntime.ts).
  }
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

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
      repos: createRepositories(db),
    })
    await scheduler.catchUp()
  } catch {
    // Best-effort — a failure here just means the user sees the same
    // reminders as an ordinary catch-up next time they open the app.
  }
}

export { REMINDERS_SYNC_TAG }
