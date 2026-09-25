import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import { createWebScheduler } from '@/notifications/scheduler'
import { syncPushRules } from '@/notifications/pushSubscription'

const PERIODIC_SYNC_TAG = 'dowi-reminders-catchup'

interface ServiceWorkerMessage {
  type?: string
  path?: string
}

/**
 * Wires the reminder scheduler into the live app: runs catch-up once per
 * app open (AC-P2), routes a tapped OS notification's deep link (relayed
 * from src/sw.ts's `notificationclick` handler via postMessage, since the
 * page — not the service worker — owns the router), and best-effort
 * registers periodic background sync so the service worker can also catch
 * up while the app is closed on platforms that support it.
 */
export function useNotificationRuntime(): void {
  const { db, settingsRepo, notificationsRepo, repos } = useDatabase()
  const navigate = useNavigate()
  const ranCatchUp = useRef(false)

  const scheduler = useMemo(
    () => createWebScheduler({ db, settingsRepo, notificationsRepo, repos }),
    [db, settingsRepo, notificationsRepo, repos],
  )

  useEffect(() => {
    if (ranCatchUp.current) return
    ranCatchUp.current = true
    void scheduler.catchUp()
    void registerPeriodicSync()
    // Keeps the push server's copy of "when to wake this device" current
    // even if it drifted (browser data cleared, or missed an earlier sync
    // point) — cheap no-op when nothing's actually changed, see
    // syncPushRules' own dedup against the last-synced payload.
    void syncPushRules({ db, settingsRepo, repos })
  }, [scheduler, db, settingsRepo, repos])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    function handleMessage(event: MessageEvent<ServiceWorkerMessage>) {
      if (event.data?.type === 'dowi:navigate' && event.data.path) {
        navigate(event.data.path)
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [navigate])
}

async function registerPeriodicSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype))
      return
    const registration = await navigator.serviceWorker.ready
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state !== 'granted') return
    const registrationWithSync = registration as ServiceWorkerRegistration & {
      periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> }
    }
    await registrationWithSync.periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval: 12 * 60 * 60 * 1000,
    })
  } catch {
    // Periodic Background Sync is Chrome-only, install-gated, and
    // best-effort by design (PRD OD-1) — silently doing nothing here is
    // the correct behaviour everywhere else.
  }
}
