import { useEffect, useState } from 'react'

/**
 * Chrome/Edge/Android fire this instead of showing their own install UI
 * once a page meets installability criteria, so a site can show its own
 * button and trigger the native prompt on demand. Not in lib.dom.d.ts.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    standaloneNavigator.standalone === true
  )
}

/** iPadOS 13+ reports as "Macintosh" but, unlike a real Mac, supports touch. */
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

export interface InstallPromptState {
  /** True once the browser has offered its native install prompt for us to trigger. */
  canInstall: boolean
  /** True on iOS Safari (no beforeinstallprompt support there) when not already installed. */
  showIOSInstructions: boolean
  /** Already running as an installed/home-screen app — nothing to offer. */
  isStandalone: boolean
  /** Shows the captured native prompt; resolves once the user has responded to it. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

/**
 * Captures `beforeinstallprompt` so a durable, always-in-the-same-place
 * install banner (InstallPrompt.tsx) can trigger it on demand, instead of
 * relying solely on the browser's own install-icon heuristics (Chrome can
 * decide not to show its own affordance based on engagement signals we
 * don't control). On iOS, where no such event exists, exposes enough to
 * show manual "Add to Home Screen" instructions instead.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    // A captured prompt event can only be used once — Chrome fires a fresh
    // beforeinstallprompt later if the page is still installable.
    setDeferredPrompt(null)
    return outcome
  }

  return {
    canInstall: deferredPrompt !== null && !isStandalone,
    showIOSInstructions: !isStandalone && isIOSDevice(),
    isStandalone,
    promptInstall,
  }
}
