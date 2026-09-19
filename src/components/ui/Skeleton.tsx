import { cn } from '@/lib/cn'

export interface SkeletonProps {
  width?: number | string
  height?: number | string
  rounded?: 'sm' | 'md' | 'lg' | 'pill'
  className?: string
}

const RADIUS: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  pill: 'var(--radius-pill)',
}

/** A loading placeholder that reserves the exact space of the real content, so it never causes layout shift once data resolves (PRD AC-H1). */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = 'sm',
  className,
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse', className)}
      style={{
        width,
        height,
        borderRadius: RADIUS[rounded],
        background: 'var(--color-surface-2)',
      }}
    />
  )
}
