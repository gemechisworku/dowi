/**
 * The fixed brand surface (top app bar, Home's hero card, section-tab
 * menus) — kept as JS constants, not --custom-properties in tokens.css.
 * Adding new top-level custom properties to that file (even a plain hex
 * colour, no gradient involved) was observed to silently drop OTHER,
 * unrelated pre-existing declarations further down the same file from the
 * parsed CSSOM — reproduced with a real regression (the explicit
 * `:root[data-theme='dark']` block's own --color-primary going missing,
 * caught by the Home accessibility e2e test) purely from growing this
 * file's size, with no invalid syntax anywhere. These three values are all
 * fixed (never theme-swapped) and never referenced from other CSS, so
 * living outside tokens.css costs nothing and sidesteps that pipeline bug
 * entirely — inline React styles never go through it. The gradient's own
 * color stops still reference --blue-600/--blue-700, which resolve
 * normally when read from an inline style.
 */
export const BRAND_GRADIENT =
  'linear-gradient(150deg, var(--blue-600), var(--blue-700) 60%, #1e3a8a)'
export const BRAND_SHADOW = '0 10px 24px rgba(37, 99, 235, 0.28)'
export const BRAND_FG = '#ffffff'
