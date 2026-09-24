/**
 * The category color-per-slice mapping shared by every chart on the Reports
 * page that breaks amounts down by category — the donut ("Where it went")
 * and the category-trend line chart both need the SAME category -> color
 * mapping, or the same category would read as two different colors
 * depending which chart you're looking at.
 */
export const CATEGORY_COLORS = [
  'var(--color-expense)',
  'var(--blue-500)',
  'var(--color-income)',
  'var(--color-warning)',
  'var(--blue-700)',
]

/** The top N-1 categories get their own color; everything past that folds into one "Other" slice/series. */
export const MAX_CATEGORY_SLICES = CATEGORY_COLORS.length
