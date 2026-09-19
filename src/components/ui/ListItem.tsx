import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ListItemProps {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  className?: string
}

/** A single row: icon/leading control, title + subtitle, trailing value/control. Used in every list screen. */
export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className,
}: ListItemProps) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 py-2.5 text-left',
        onClick && 'active:opacity-70',
        className,
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[15px] font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </span>
        )}
      </span>
      {trailing}
    </Wrapper>
  )
}
