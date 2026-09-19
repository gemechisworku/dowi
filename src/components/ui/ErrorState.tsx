import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Try again — your data is safe on this device.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <span aria-hidden="true" className="mb-3 text-4xl">
        ⚠️
      </span>
      <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text)' }}>
        {title}
      </p>
      <p className="mt-1.5 max-w-xs text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {description}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
