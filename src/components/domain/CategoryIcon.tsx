export interface CategoryIconProps {
  icon: string
  color?: string
  size?: number
}

/** The tinted squircle icon chip used for categories/sources/accounts throughout (Option A). */
export function CategoryIcon({
  icon,
  color = 'var(--color-primary)',
  size = 34,
}: CategoryIconProps) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-xl text-base"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${color} 16%, var(--color-surface-2))`,
        color,
      }}
    >
      {icon}
    </span>
  )
}
