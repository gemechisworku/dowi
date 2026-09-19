import { cn } from '@/lib/cn'

export interface CollectionChipProps {
  name: string
  color?: string
  onClick?: () => void
  selected?: boolean
  className?: string
}

/** A named, coloured collection/tag pill (notes collections, task collections). */
export function CollectionChip({
  name,
  color = 'var(--color-primary)',
  onClick,
  selected,
  className,
}: CollectionChipProps) {
  const Comp = onClick ? 'button' : 'span'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
        className,
      )}
      style={{
        background: selected ? color : 'var(--color-surface-2)',
        color: selected ? 'var(--color-primary-fg)' : 'var(--color-text)',
      }}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: selected ? 'currentColor' : color }}
      />
      {name}
    </Comp>
  )
}
