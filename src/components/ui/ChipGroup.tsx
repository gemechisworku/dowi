import type { ReactNode } from 'react'

export interface ChipGroupProps {
  label?: string
  children: ReactNode
  className?: string
}

/** A horizontally scrollable row of Chips with a shared accessible group label. */
export function ChipGroup({ label, children, className }: ChipGroupProps) {
  return (
    <div className={className}>
      {label && (
        <span
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </span>
      )}
      <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
        {children}
      </div>
    </div>
  )
}
