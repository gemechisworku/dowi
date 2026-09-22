import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useSnackbar } from '@/components/ui/useSnackbar'

/**
 * PRD §6.3: "Update flow: SW detects new version → non-blocking 'Update
 * available' snackbar → reload applies it." Renders nothing itself — a
 * non-visual component that registers the service worker (this is now the
 * app's one and only registration path; see vite.config.ts's
 * `injectRegister: false`) and surfaces `needRefresh` as a snackbar.
 *
 * Reloading is the user's call, never automatic: `updateServiceWorker(true)`
 * only runs from the snackbar's own "Reload" action, which messages the
 * waiting worker to skip waiting (src/sw.ts's own message listener) and
 * reloads once it takes control — nothing here forces that on its own.
 */
export function UpdatePrompt() {
  const { show } = useSnackbar()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // Best-effort — a failed registration just means this session runs
      // without offline/notification support, not a broken app.
      console.error('Service worker registration failed', error)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    show({
      message: 'Update available',
      action: { label: 'Reload', onClick: () => void updateServiceWorker(true) },
      // Longer than the default 5s undo window — this isn't urgent to act
      // on immediately, and missing it costs nothing (the update just
      // waits for the next natural reload).
      duration: 15_000,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh])

  return null
}
