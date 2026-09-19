import type { ReactNode } from 'react'

export interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="text-[13.5px] font-bold" style={{ color: 'var(--color-text)' }}>
        {title}
      </h2>
      {action}
    </div>
  )
}
