import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type CardProps = HTMLAttributes<HTMLDivElement>

/**
 * The base white/dark-surface rounded container used throughout Option A
 * ("Soft Cards"). Padding comes from `--space-card` (src/styles/tokens.css)
 * rather than a `p-4` utility class so Settings → Appearance's density
 * control has something real to shrink (an inline style always wins over a
 * utility class, so this doesn't need `!important` or class-order tricks).
 */
export function Card({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-[var(--radius-lg)]', className)}
      style={{
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--space-card)',
        ...style,
      }}
      {...props}
    />
  )
}
