/**
 * Shared sizing/label helpers for the hand-rolled SVG charts in this folder.
 *
 * The charts used to render into a fixed 100-unit-wide viewBox stretched
 * with `preserveAspectRatio="none"` to fill whatever width the container
 * happened to have — fine for a couple of bars, but with more items (or
 * long labels) everything got squeezed and clipped. Instead each chart now
 * computes an intrinsic pixel width from its item count and scrolls
 * horizontally (via `ChartScrollContainer`) when that's wider than the
 * viewport, so bars/points/labels always get their natural amount of room.
 */

/** Px reserved per bar/group/point before horizontal scrolling kicks in. */
export const MIN_ITEM_WIDTH = 48

export const CHART_LABEL_FONT_SIZE = 11

export const CHART_LABEL_MAX_CHARS = 10

export function computeChartWidth(itemCount: number, minWidth = 280): number {
  return Math.max(minWidth, itemCount * MIN_ITEM_WIDTH)
}

export function truncateLabel(label: string, maxChars = CHART_LABEL_MAX_CHARS): string {
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label
}
