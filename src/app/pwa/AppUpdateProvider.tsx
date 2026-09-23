import type { ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppUpdateContext } from './AppUpdateContext'

/**
 * How often an already-open session re-checks for a new deploy on its own,
 * on top of the checks the browser/Workbox already do on navigation.
 */
const AUTO_CHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * `useRegisterSW()` isn't a shared singleton — every call creates its own
 * `Workbox` instance and calls `.register()` again (see vite-plugin-pwa's
 * react virtual module). It must only ever be called once, here, which is
 * also this app's one and only service worker registration path (see
 * vite.config.ts's `injectRegister: false`). `UpdatePrompt` (the blocking
 * dialog) and `AboutSettings` (the passive Settings status) both read the
 * same `needRefresh` via `useAppUpdate()` instead of registering
 * independently.
 */
export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // Best-effort — a failed registration just means this session runs
      // without offline/notification support, not a broken app.
      console.error('Service worker registration failed', error)
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => void registration.update(), AUTO_CHECK_INTERVAL_MS)
    },
  })

  return (
    <AppUpdateContext.Provider
      value={{
        needRefresh,
        dismiss: () => setNeedRefresh(false),
        updateApp: () => void updateServiceWorker(true),
      }}
    >
      {children}
    </AppUpdateContext.Provider>
  )
}
