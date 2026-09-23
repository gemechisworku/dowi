import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { DEFAULT_STREAK_STATE, shouldShowDailyOverlay } from '@/db/streakRepo'
import { todayString } from '@/lib/period'
import { ConfettiBurst } from './ConfettiBurst'

const AUTO_DISMISS_MS = 4000

/**
 * A light, auto-dismissing reward banner shown once per calendar day the
 * app is opened after a qualifying action — distinct from
 * `StreakCelebrationOverlay`'s bigger, blocking 7-day-milestone dialog,
 * which takes precedence on milestone days (no double celebration; see
 * `shouldShowDailyOverlay`). Deliberately not a modal/`alertdialog` — this
 * is a passive reward, not something that should block interaction or
 * demand acknowledgement every single day.
 *
 * Visibility is driven entirely by the live streak state (`eligible`
 * below), not separate local state: dismissing (manually or via the
 * auto-dismiss timer) just persists `lastDailyBadgeShownDate`, and the
 * live query re-evaluating `shouldShowDailyOverlay` to false is what
 * actually hides it.
 */
export function StreakDailyOverlay() {
  const { repos } = useDatabase()
  const streak = useLiveQuery(() => repos.streak.get(), [repos], DEFAULT_STREAK_STATE)
  const today = todayString()
  const eligible = shouldShowDailyOverlay(streak, today)

  useEffect(() => {
    if (!eligible) return
    const timer = setTimeout(() => void repos.streak.markDailyBadgeShown(today), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [eligible, repos, today])

  if (!eligible) return null

  return createPortal(
    <>
      <ConfettiBurst active={eligible} />
      <button
        type="button"
        onClick={() => void repos.streak.markDailyBadgeShown(today)}
        aria-label={`${streak.currentStreak}-day streak — dismiss`}
        className="fixed left-1/2 top-6 z-[var(--z-toast)] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-[var(--radius-lg)] px-5 py-4 text-left"
        style={{
          // Kept fully within the dark end of the warm palette (not the
          // brighter #f97316/#ea580c oranges) — those read as more
          // energetic but drop white text below WCAG AA; see MoneyText's
          // --color-expense comment on Home for the same class of tradeoff.
          background: 'linear-gradient(135deg, #92400e, #7c2d12 60%, #431407)',
          boxShadow: 'var(--shadow-elevated)',
          color: '#ffffff',
        }}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-4xl font-extrabold tabular-nums">
            {streak.currentStreak}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {streak.currentStreak}-day streak <span aria-hidden="true">🔥</span>
            </p>
            <p className="text-xs" style={{ opacity: 0.9 }}>
              You showed up today — keep it going tomorrow.
            </p>
          </div>
        </div>
      </button>
    </>,
    document.body,
  )
}
