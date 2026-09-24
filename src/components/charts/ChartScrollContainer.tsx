import type { ReactNode } from 'react'

/**
 * Horizontal-scroll wrapper for charts whose intrinsic width (see
 * `computeChartWidth`) can exceed the viewport — matches the scrollbar-less
 * horizontal-scroll idiom already used by `MoneySubNav`.
 */
export function ChartScrollContainer({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto overscroll-x-contain" style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  )
}
