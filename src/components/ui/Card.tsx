import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type CardProps = HTMLAttributes<HTMLDivElement>

/** The base white/dark-surface rounded container used throughout Option A ("Soft Cards"). */
export function Card({ className, style, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-[var(--radius-lg)] p-4', className)}
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', ...style }}
      {...props}
    />
  )
}
