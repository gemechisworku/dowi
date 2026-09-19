import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: ReactNode
}

/** A single selectable pill, e.g. a category in the transaction form. Use ChipGroup for a labelled set. */
export function Chip({ selected = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors',
        className,
      )}
      style={{
        background: selected ? 'var(--color-primary)' : 'var(--color-surface-2)',
        color: selected ? 'var(--color-primary-fg)' : 'var(--color-text)',
      }}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
