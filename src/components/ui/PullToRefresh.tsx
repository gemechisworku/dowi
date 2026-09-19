import { useRef, useState, type ReactNode } from 'react'
import { Spinner } from './Spinner'

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: ReactNode
}

const TRIGGER_DISTANCE = 64

/**
 * Wraps a scrollable list to add pull-to-refresh. Since all data is local
 * (PRD D2), "refresh" here means "re-run the current query" — useful after
 * an import, or just as a familiar, reassuring gesture.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handlePointerDown(e: React.PointerEvent) {
    if ((containerRef.current?.scrollTop ?? 0) > 0) return
    startY.current = e.clientY
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (startY.current === null || refreshing) return
    const delta = e.clientY - startY.current
    if (delta > 0) setPull(Math.min(delta * 0.5, 90))
  }
  async function handlePointerUp() {
    startY.current = null
    if (pull > TRIGGER_DISTANCE) {
      setRefreshing(true)
      setPull(TRIGGER_DISTANCE)
      await onRefresh()
      setRefreshing(false)
    }
    setPull(0)
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative"
    >
      <div
        aria-hidden={!refreshing}
        className="flex items-center justify-center overflow-hidden transition-[height]"
        style={{ height: pull }}
      >
        {(refreshing || pull > 20) && <Spinner size={20} label="Refreshing" />}
      </div>
      {children}
    </div>
  )
}
