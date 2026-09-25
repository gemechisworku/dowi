/**
 * Persistence for the custom install banner's dismiss action. Same
 * localStorage try/catch shape as `profilePromptDismissal.ts` — permanent
 * once dismissed, since the OS-level install option (browser menu / Share
 * sheet) is always still there for someone who changes their mind later.
 */

const DISMISS_KEY = 'dowi:pwa:installPromptDismissed'

export function isInstallPromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // ignore persistence failures
  }
}
