import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { SnackbarContext, type SnackbarRequest } from './SnackbarContext'

interface SnackbarState extends SnackbarRequest {
  id: number
}

/**
 * A single snackbar slot, floating above the bottom nav. Used for delete-undo
 * (PRD AC-M3) and other transient confirmations. Only one is shown at a
 * time — a new one replaces whatever is currently visible.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextId = useRef(0)

  const show = useCallback((request: SnackbarRequest) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = ++nextId.current
    setSnackbar({ ...request, id })
    const duration = request.duration ?? 5000
    timerRef.current = setTimeout(() => {
      setSnackbar((current) => (current?.id === id ? null : current))
    }, duration)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snackbar &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[var(--z-toast)] flex justify-center px-4"
          >
            <div
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium"
              style={{ background: 'var(--color-text)', color: 'var(--color-bg)' }}
            >
              <span>{snackbar.message}</span>
              {snackbar.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 underline"
                  style={{ color: 'var(--color-primary)' }}
                  onClick={() => {
                    snackbar.action?.onClick()
                    setSnackbar(null)
                  }}
                >
                  {snackbar.action.label}
                </Button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </SnackbarContext.Provider>
  )
}
