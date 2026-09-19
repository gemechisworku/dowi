/**
 * Tiny className combiner — accepts strings, falsy values, and objects of
 * { className: boolean }. Deliberately not clsx/cva: keeps the bundle free
 * of a dependency for something this small.
 */
export type ClassValue = string | number | false | null | undefined | Record<string, boolean>

export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value))
    } else {
      for (const key in value) {
        if (value[key]) out.push(key)
      }
    }
  }
  return out.join(' ')
}
