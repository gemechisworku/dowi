import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'primary' | 'income' | 'expense' | 'warning' | 'neutral'

export interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const TONE_STYLE: Record<BadgeTone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' },
  income: { bg: 'var(--color-income-soft)', fg: 'var(--color-income)' },
  expense: { bg: 'var(--color-expense-soft)', fg: 'var(--color-expense)' },
  warning: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
  neutral: { bg: 'var(--color-surface-2)', fg: 'var(--color-text-muted)' },
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  const { bg, fg } = TONE_STYLE[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        className,
      )}
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  )
}
