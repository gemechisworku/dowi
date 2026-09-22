/**
 * Trimmed, case-sensitive exact match — the gating logic behind
 * `TypeToConfirmDialog` (src/components/ui/TypeToConfirmDialog.tsx), pulled
 * out into its own module so that component file can export only the
 * component (react-refresh/only-export-components) and so this is directly
 * unit-testable without mounting anything.
 */
export function matchesConfirmPhrase(input: string, phrase: string): boolean {
  return input.trim() === phrase
}
