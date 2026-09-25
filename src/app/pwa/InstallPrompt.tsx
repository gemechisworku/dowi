import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { useInstallPrompt } from './useInstallPrompt'
import { isInstallPromptDismissed, dismissInstallPrompt } from './installPromptDismissal'

/**
 * A durable, always-in-the-same-place "Install Dowi" banner — a fallback to
 * (not a replacement for) the browser's own native install affordance,
 * since that depends on Chrome's own engagement heuristics and doesn't
 * exist at all on iOS. Android/Chrome gets a real one-tap install button
 * (via the captured beforeinstallprompt event); iOS gets manual
 * instructions, since Safari has no programmatic install API.
 */
export function InstallPrompt() {
  const { canInstall, showIOSInstructions, isStandalone, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(isInstallPromptDismissed)

  function handleDismiss() {
    dismissInstallPrompt()
    setDismissed(true)
  }

  async function handleInstall() {
    const outcome = await promptInstall()
    if (outcome === 'accepted') handleDismiss()
  }

  if (isStandalone || dismissed || !(canInstall || showIOSInstructions)) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex justify-center px-4">
      <Card
        className="pointer-events-auto flex w-full max-w-md items-center gap-3"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <span aria-hidden="true" className="text-xl">
          📲
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Install Dowi</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {canInstall
              ? 'Add it to your home screen for quick, offline access.'
              : 'Tap Share, then "Add to Home Screen".'}
          </p>
        </div>
        {canInstall && (
          <Button size="sm" onClick={() => void handleInstall()}>
            Install
          </Button>
        )}
        <IconButton aria-label="Dismiss" icon="✕" variant="ghost" onClick={handleDismiss} />
      </Card>
    </div>,
    document.body,
  )
}
