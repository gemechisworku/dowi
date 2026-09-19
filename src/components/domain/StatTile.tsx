import type { ReactNode } from 'react'

export interface StatTileProps {
  label: string
  value: ReactNode
  tone?: 'income' | 'expense' | 'neutral'
  delta?: string
}

/** A single labelled number in a headline row (Income / Expense / Net). */
export function StatTile({ label, value, delta }: StatTileProps) {
  return (
    <div className="flex-1">
      <div
        className="text-[10.5px] font-bold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
      <div className="mt-0.5 text-[17px] font-bold">{value}</div>
      {delta && (
        <div
          className="mt-0.5 text-[11px] font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {delta}
        </div>
      )}
    </div>
  )
}
