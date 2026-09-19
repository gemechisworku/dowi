import { useTheme } from '@/app/theme/useTheme'
import { Card } from '@/components/ui/Card'
import { ButtonsSection } from './sections/ButtonsSection'
import { FormsSection } from './sections/FormsSection'
import { FeedbackSection } from './sections/FeedbackSection'
import { DomainSection } from './sections/DomainSection'
import { ChartsSection } from './sections/ChartsSection'

/**
 * Every component in the kit, in every state, in one place — so a theme or
 * token change can be checked against the whole library at once instead of
 * hunting through feature screens. See PLAN.md §M1 and TESTING.md §M1.
 */
export function KitchenSinkPage() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Kitchen sink</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          The full component library, Option A "Soft Cards" tokens.
        </p>
      </div>

      <Card>
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
      </Card>

      <ButtonsSection />
      <FormsSection />
      <FeedbackSection />
      <DomainSection />
      <ChartsSection />
    </div>
  )
}
