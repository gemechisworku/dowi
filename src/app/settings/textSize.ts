import type { Settings } from '@/db/types'

const VALID: readonly Settings['textSize'][] = ['s', 'm', 'l']

/**
 * Defends `ApplyAppearance` (and anything else reading `Settings.textSize`)
 * against a value that isn't one of the three known sizes — e.g. a merge
 * import from a hand-edited or future-format backup file (PRD AC-S3: a bad
 * file should degrade gracefully, not crash the whole app). Unknown/missing
 * values fall back to 'm', the same as `DEFAULT_SETTINGS`.
 */
export function normalizeTextSize(value: unknown): Settings['textSize'] {
  return VALID.includes(value as Settings['textSize']) ? (value as Settings['textSize']) : 'm'
}
