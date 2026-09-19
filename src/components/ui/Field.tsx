import { useId, type ReactNode } from 'react'

export interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: (ids: { inputId: string; describedBy?: string }) => ReactNode
}

/**
 * Wraps a single form control with a label, optional hint and error text,
 * wiring up htmlFor/aria-describedby so every field is announced correctly
 * by a screen reader without every component re-implementing this.
 */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: 'var(--color-expense)' }}>
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children({ inputId, describedBy })}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium"
          style={{ color: 'var(--color-expense)' }}
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
