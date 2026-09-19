import { useTheme } from '@/app/theme/useTheme'

/**
 * Placeholder for M0. The real component-kit showcase (every primitive, in
 * every state, in both themes) is built in milestone M1 — see PLAN.md §M1
 * and TESTING.md §M1.
 */
export function KitchenSinkPage() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="px-4 pt-2 pb-8">
      <h1 className="text-xl font-bold tracking-tight">Kitchen sink</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Component kit lands in M1. For now, this verifies the theme provider and design tokens
        end-to-end.
      </p>

      <div
        className="mt-4 rounded-[22px] p-4"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
      >
        <p className="text-sm font-semibold">Theme preference</p>
        <div className="mt-3 flex gap-2">
          {(['system', 'light', 'dark'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPreference(option)}
              aria-pressed={preference === option}
              className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize"
              style={{
                background:
                  preference === option ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: preference === option ? 'var(--color-primary-fg)' : 'var(--color-text)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <div
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--color-income)' }}
        >
          Income
        </div>
        <div
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--color-expense)' }}
        >
          Expense
        </div>
        <div
          className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--color-warning)' }}
        >
          Warning
        </div>
      </div>
    </div>
  )
}
