import type { TourCategory, TourStep } from './tourContent'

export type TourAction = 'next' | 'back' | { jumpToCategory: TourCategory }

/**
 * Pure index arithmetic for the tour's flat step list — kept separate from
 * `GettingStartedTour.tsx` so the bounds/jump logic is unit-testable without
 * mounting a Sheet. Bounds-checked as a no-op past either end (the UI also
 * disables Back on the first step and turns Next into "Done" on the last,
 * but this is the belt-and-braces guarantee for the underlying logic).
 */
export function nextTourIndex(
  steps: readonly TourStep[],
  index: number,
  action: TourAction,
): number {
  if (action === 'next') return Math.min(index + 1, steps.length - 1)
  if (action === 'back') return Math.max(index - 1, 0)
  const firstInCategory = steps.findIndex((s) => s.category === action.jumpToCategory)
  return firstInCategory === -1 ? index : firstInCategory
}
