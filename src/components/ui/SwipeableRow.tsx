import { useRef, useState, type ReactNode } from 'react'

export interface SwipeableRowProps {
  children: ReactNode
  onSwipeLeft?: () => void
  /** Label announced/shown behind the row while swiping, e.g. "Delete". */
  actionLabel?: string
  danger?: boolean
}

const REVEAL_WIDTH = 84
const TRIGGER_THRESHOLD = 64

/**
 * A row that reveals a single action (typically delete) on swipe-left, used
 * in the transaction and task lists. Deliberately single-action: multiple
 * hidden swipe actions are a discoverability problem on a first-time
 * mobile UI, and every list here also exposes the same action from the
 * row's own detail screen.
 */
export function SwipeableRow({
  children,
  onSwipeLeft,
  actionLabel = 'Delete',
  danger = true,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX
    setDragging(true)
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (startX.current === null) return
    const delta = e.clientX - startX.current
    setOffset(Math.max(-REVEAL_WIDTH * 1.4, Math.min(0, delta)))
  }
  function handlePointerUp() {
    setDragging(false)
    if (offset < -TRIGGER_THRESHOLD) {
      onSwipeLeft?.()
    }
    setOffset(0)
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 flex items-center justify-center text-sm font-semibold"
        style={{
          width: REVEAL_WIDTH,
          background: danger ? 'var(--color-danger-solid)' : 'var(--color-primary)',
          opacity: offset < 0 ? 1 : 0,
          // danger uses the fixed, always-dark-enough --color-danger-solid
          // paired with white; the primary case must follow the theme's
          // own foreground pairing since --color-primary lightens in dark
          // mode (see the --color-danger-solid comment in tokens.css).
          color: danger ? '#ffffff' : 'var(--color-primary-fg)',
        }}
      >
        {actionLabel}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform var(--motion-base) var(--motion-ease)',
          // Swipe actions sit directly behind this layer. It must stay opaque
          // so the destructive colour cannot bleed through translucent cards.
          background: 'var(--color-surface-solid)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
