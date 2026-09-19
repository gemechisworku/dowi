import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

/** Shown wherever a list/report has no data yet — never a blank screen (PRD AC-R4). */
export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span aria-hidden="true" className="mb-3 text-4xl">
        {icon}
      </span>
      <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
