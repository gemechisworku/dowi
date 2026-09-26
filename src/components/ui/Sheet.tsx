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
  // The URL at the moment we pushed our entry. Sheet content can itself
  // change the URL while open (e.g. a filter sheet's Apply calling
  // setSearchParams) — that change lands on *our* pushed entry, since it's
  // the current one. If we blindly called history.back() to consume that
  // entry afterward, we'd revert the content's own legitimate change along
  // with it. Comparing against this lets us skip the consume in that case.
  const pushedHrefRef = useRef<string | null>(null)
  // Consuming that entry via history.back() re-fires 'popstate', which
  // would otherwise call onClose a second time — this guards onClose to
  // fire exactly once per open/close cycle no matter which path triggered it.
  const closedRef = useRef(false)
  // Bumped on every run of the history-owning effect below. Lets a given
  // run's cleanup tell "a later run has since taken over" (generation moved
  // on) apart from "nothing has, this really is the final close" — see that
  // effect for why a shared boolean alone can't make that distinction.
  const mountGenerationRef = useRef(0)

  useFocusTrap(containerRef, open)
  useLockBodyScroll(open)

  function closeOnce() {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
  }

  // Consumes the pushed entry via history.back() — but only if the URL is
  // still what it was when we pushed it (see pushedHrefRef above). If
  // something changed it while our entry was current, going back would
  // revert that change, so we leave the entry in place instead: a rare,
  // harmless extra history frame beats silently undoing app state.
  function consumeHistoryEntryIfUnchanged() {
    ownsHistoryEntry.current = false
    if (window.location.href === pushedHrefRef.current) {
      window.history.back()
    }
  }

  // Close requested from *inside* the sheet (scrim, Escape, form submit, ...).
  function requestClose() {
    if (ownsHistoryEntry.current) consumeHistoryEntryIfUnchanged()
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
    mountGenerationRef.current += 1
    const myGeneration = mountGenerationRef.current

    // React Strict Mode synchronously reruns this effect (mount → cleanup →
    // mount) for the *same* open sheet before anything yields. Pushing
    // unconditionally on every run would push two history entries for one
    // logical "open" — and because `ownsHistoryEntry` is shared, the first
    // run's cleanup couldn't tell "the second run since took ownership" apart
    // from "nothing did, this is a real close", so it went ahead and consumed
    // whatever entry happened to be on top (the second run's, not its own),
    // closing the sheet the instant it reopened. Skipping the push whenever
    // one is already pending makes it idempotent — exactly one entry per
    // logical open — and the generation counter (below) is what lets a
    // superseded run's cleanup correctly stand down instead of guessing from
    // a boolean that every run overwrites the same way.
    if (!ownsHistoryEntry.current) {
      window.history.pushState({ dowiSheet: true }, '')
      ownsHistoryEntry.current = true
      pushedHrefRef.current = window.location.href
    }

    function handlePopState() {
      if (mountGenerationRef.current !== myGeneration) return
      ownsHistoryEntry.current = false
      closeOnce()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Covers a close path that bypassed requestClose (e.g. a "Cancel"
      // button that calls the outer onClose prop directly) — the pushed
      // entry must still be consumed so it doesn't eat a later back press.
      if (!ownsHistoryEntry.current) return
      // Deferred one microtask so a synchronous Strict-Mode remount gets a
      // chance to run first; the generation check is what actually decides
      // whether to act, not just having survived the wait.
      queueMicrotask(() => {
        if (mountGenerationRef.current !== myGeneration) return
        if (ownsHistoryEntry.current) consumeHistoryEntryIfUnchanged()
      })
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
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[24px] border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
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
