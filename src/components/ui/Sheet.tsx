import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { useLockBodyScroll } from '@/lib/useLockBodyScroll'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: ReactNode
}

/**
 * A bottom sheet for create/edit forms (add transaction, add task, ...).
 * Dismissible by: scrim tap, Escape, the browser/gesture back action, or a
 * drag-down past a threshold on the grabber (PRD/TESTING §M1).
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  // Tracks whether we've pushed a history entry for this open sheet that
  // still needs consuming, so scrim/Escape/programmatic closes don't leave
  // a stale entry that would eat the user's *next* physical back press.
  const ownsHistoryEntry = useRef(false)
  // Consuming that entry via history.back() re-fires 'popstate', which
  // would otherwise call onClose a second time — this guards onClose to
  // fire exactly once per open/close cycle no matter which path triggered it.
  const closedRef = useRef(false)

  useFocusTrap(containerRef, open)
  useLockBodyScroll(open)

  function closeOnce() {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
  }

  // Close requested from *inside* the sheet (scrim, Escape, form submit, ...).
  function requestClose() {
    if (ownsHistoryEntry.current) {
      ownsHistoryEntry.current = false
      window.history.back()
    }
    closeOnce()
  }

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Dismiss on the Android hardware/gesture back action.
  useEffect(() => {
    if (!open) return
    closedRef.current = false
    window.history.pushState({ dowiSheet: true }, '')
    ownsHistoryEntry.current = true
    function handlePopState() {
      ownsHistoryEntry.current = false
      closeOnce()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Covers a close path that bypassed requestClose (e.g. a "Cancel"
      // button that calls the outer onClose prop directly) — the pushed
      // entry must still be consumed so it doesn't eat a later back press.
      if (ownsHistoryEntry.current) {
        ownsHistoryEntry.current = false
        window.history.back()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  function handleDragStart(e: React.PointerEvent) {
    dragStartY.current = e.clientY
  }
  function handleDragMove(e: React.PointerEvent) {
    if (dragStartY.current === null || !sheetRef.current) return
    const delta = Math.max(0, e.clientY - dragStartY.current)
    sheetRef.current.style.transform = `translateY(${delta}px)`
  }
  function handleDragEnd(e: React.PointerEvent) {
    if (dragStartY.current === null || !sheetRef.current) return
    const delta = e.clientY - dragStartY.current
    dragStartY.current = null
    if (delta > 90) {
      requestClose()
    } else {
      sheetRef.current.style.transform = ''
    }
  }

  return createPortal(
    <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 'var(--z-sheet)' }}>
      <div
        aria-hidden="true"
        onClick={requestClose}
        className="absolute inset-0"
        style={{ background: 'var(--color-scrim)' }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[var(--radius-lg)] pb-[env(safe-area-inset-bottom)]"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-elevated)' }}
      >
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pb-1 pt-2.5 active:cursor-grabbing"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-10 rounded-full"
            style={{ background: 'var(--color-border-strong)' }}
          />
        </div>
        {title && (
          <h2 className="px-5 pb-3 pt-1 text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {title}
          </h2>
        )}
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
