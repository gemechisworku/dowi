import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useAppUpdate } from './useAppUpdate'

/**
 * PRD §6.3 (updated): SW detects new version → a blocking prompt (not just a
 * dismiss-and-forget snackbar) so a new build is something the user
 * consciously accepts or defers, not something they can miss entirely.
 * State comes from `AppUpdateProvider` (mounted once in App.tsx), which owns
 * the actual service worker registration — see AppUpdateContext.tsx for why
 * this component doesn't call `useRegisterSW()` itself.
 */
export function UpdatePrompt() {
  const { needRefresh, dismiss, updateApp } = useAppUpdate()

  return (
    <Dialog
      open={needRefresh}
      onClose={dismiss}
      title="Update available"
      actions={
        <>
          <Button variant="secondary" onClick={dismiss}>
            Later
          </Button>
          <Button onClick={updateApp}>Update app</Button>
        </>
      }
    >
      A new version of Dowi is ready. Update now to get the latest fixes and features.
    </Dialog>
  )
}
