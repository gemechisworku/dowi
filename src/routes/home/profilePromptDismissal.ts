/**
 * Persistence for Home's soft, dismissible "what should we call you?"
 * prompt. Same localStorage try/catch shape as `homeTour.ts`'s dismiss —
 * permanent once skipped, since the name stays settable any time from
 * Settings → Profile, so there's nothing to keep nagging about.
 */

const DISMISS_KEY = 'dowi:home:profilePromptDismissed'

export function isProfilePromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissProfilePrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // ignore persistence failures
  }
}
