export interface SpinnerProps {
  size?: number
  label?: string
}

export function Spinner({ size = 20, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size, color: 'var(--color-primary)' }}
    />
  )
}
