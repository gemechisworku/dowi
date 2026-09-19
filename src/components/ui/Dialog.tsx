import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { useLockBodyScroll } from '@/lib/useLockBodyScroll'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  actions?: ReactNode
}

/** A centred modal for confirmations and short forms. Traps focus and restores it to the trigger on close (TESTING §M1). */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, open)
  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center p-5"
      style={{ zIndex: 'var(--z-dialog)' }}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'var(--color-scrim)' }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dowi-dialog-title"
        className="relative w-full max-w-sm rounded-[var(--radius-lg)] p-5"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-elevated)' }}
      >
        <h2
          id="dowi-dialog-title"
          className="text-lg font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h2>
        {children && (
          <div className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {children}
          </div>
        )}
        {actions && <div className="mt-5 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>,
    document.body,
  )
}
