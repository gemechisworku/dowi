import { cn } from '@/lib/cn'

export interface AvatarProps {
  /** Full name (or any label) used to derive initials when no image is given. */
  name: string
  src?: string
  size?: number
  className?: string
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function Avatar({ name, src, size = 34, className }: AvatarProps) {
  const dimension = { width: size, height: size, fontSize: Math.round(size * 0.4) }
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', className)}
        style={dimension}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-white',
        className,
      )}
      style={{
        ...dimension,
        background: 'linear-gradient(135deg, var(--blue-500), var(--blue-700))',
      }}
    >
      {initialsOf(name)}
    </div>
  )
}
