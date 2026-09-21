/**
 * Thin wrapper around the Notification permission API. Also imported
 * (transitively, via scheduler.ts) into the service worker's build — the
 * `Notification` global there is a reduced version without
 * `requestPermission` (that call is only valid from a document), so
 * everything here is written to type-check under both lib configs without
 * referencing `window` or assuming the full page-side `Notification` shape.
 */

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function isNotificationSupported(): boolean {
  return typeof Notification !== 'undefined'
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Must be called from a user gesture (PRD §5.7 — requested in context, never on first launch). */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported'
  const requestPermission = (
    Notification as unknown as { requestPermission?: () => Promise<NotificationPermissionState> }
  ).requestPermission
  if (!requestPermission) return 'unsupported'
  return requestPermission()
}
