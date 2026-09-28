import { useLayoutEffect } from 'react'

// Module-level, not per-hook-instance state: a Dialog opened from within an
// already-open Sheet (e.g. a delete confirmation) must not re-enable the
// background the instant the *inner* one closes — only the last of any
// nested Sheet/Dialog stack closing should do that.
let openCount = 0

/**
 * Makes the app root `inert` (unreachable to focus, keyboard nav and
 * assistive tech, and skipped by axe's color-contrast check) while a
 * Sheet/Dialog is open. Both are portaled to `document.body` as siblings of
 * `#root`, so this never touches the modal itself — only what's now sitting,
 * visually inert, behind its scrim. Without this, background content stayed
 * fully in the accessible tree even though the scrim makes it unreadable —
 * axe caught this as a color-contrast violation on whatever the scrim
 * happened to dim to a failing ratio, but the real bug is that it should
 * never have been checked as visible content at all while covered.
 */
export function useInertBackground(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    const root = document.getElementById('root')
    openCount += 1
    if (root && openCount === 1) root.inert = true
    return () => {
      openCount -= 1
      if (root && openCount === 0) root.inert = false
    }
  }, [active])
}
