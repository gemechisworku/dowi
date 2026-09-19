export interface TaskCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

/** The round checkbox used for tasks/subtasks — visually distinct from the form Checkbox (which is square, for settings/filters). */
export function TaskCheckbox({ checked, onChange, label }: TaskCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: checked ? 'var(--color-primary)' : 'var(--color-border-strong)',
          background: checked ? 'var(--color-primary)' : 'transparent',
        }}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" style={{ color: 'var(--color-primary-fg)' }}>
            <path
              d="M3 8.5l3 3 7-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  )
}
