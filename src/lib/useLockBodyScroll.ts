import { useLayoutEffect } from 'react'

/** Prevents the page behind a Sheet/Dialog from scrolling while it's open. */
export function useLockBodyScroll(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [active])
}
