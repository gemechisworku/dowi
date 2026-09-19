import { cn } from '@/lib/cn'

export function Divider({ className }: { className?: string }) {
  return (
    <hr
      className={cn('my-0 border-0', className)}
      style={{ height: 1, background: 'var(--color-border)' }}
    />
  )
}
