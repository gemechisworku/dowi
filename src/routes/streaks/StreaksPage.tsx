import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'
import type { Settings } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { todayString } from '@/lib/period'
import { DEFAULT_STREAK_STATE } from '@/db/streakRepo'
import { Card } from '@/components/ui/Card'
import { PeriodStepper } from '@/components/domain/PeriodStepper'
import { BADGE_TIERS, isBadgeUnlocked, countUnlockedBadges } from './badges'
import { MonthActivityCalendar } from './MonthActivityCalendar'
import { getCurrentStreakDates, getMonthLabel, shiftMonthKey } from './monthCalendar'

/** Streaks & badges (M13) — reachable from the header icon just after the theme toggle (TopAppBar.tsx). */
export function StreaksPage() {
  const { repos, settingsRepo } = useDatabase()
  const settingsData = useLiveQuery(
    () => settingsRepo.get(),
    [settingsRepo],
    DEFAULT_SETTINGS,
  ) as Settings
  const streak = useLiveQuery(() => repos.streak.get(), [repos], DEFAULT_STREAK_STATE)
  const activityEntries = useLiveQuery(() => repos.activityLog.list(), [repos], EMPTY_ARRAY)

  const today = todayString()
  const [monthKey, setMonthKey] = useState(() => today.slice(0, 7))

  const activityByDate = useMemo(
    () => new Map(activityEntries.map((e) => [e.date, e.count])),
    [activityEntries],
  )
  const streakDates = useMemo(
    () => getCurrentStreakDates(streak.lastActiveDate, streak.currentStreak),
    [streak.lastActiveDate, streak.currentStreak],
  )
  const unlockedCount = countUnlockedBadges(streak.longestStreak)

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-6">
      <h1 className="text-lg font-bold tracking-tight">Streaks &amp; Badges</h1>

      <Card className="flex items-center justify-around text-center">
        <div>
          <p className="text-2xl font-extrabold tabular-nums">
            {streak.currentStreak}
            <span aria-hidden="true"> 🔥</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Current streak
          </p>
        </div>
        <div className="h-10 w-px" style={{ background: 'var(--color-border)' }} />
        <div>
          <p className="text-2xl font-extrabold tabular-nums">{streak.longestStreak}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Longest streak
          </p>
        </div>
        <div className="h-10 w-px" style={{ background: 'var(--color-border)' }} />
        <div>
          <p className="text-2xl font-extrabold tabular-nums">
            {unlockedCount}/{BADGE_TIERS.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Badges earned
          </p>
        </div>
      </Card>

      <Card>
        <PeriodStepper
          label={getMonthLabel(monthKey)}
          onPrevious={() => setMonthKey((k) => shiftMonthKey(k, -1))}
          onNext={() => setMonthKey((k) => shiftMonthKey(k, 1))}
          nextDisabled={monthKey >= today.slice(0, 7)}
        />
        <div className="mt-3">
          <MonthActivityCalendar
            monthKey={monthKey}
            weekStartsOn={settingsData.weekStartsOn}
            activityByDate={activityByDate}
            streakDates={streakDates}
            today={today}
          />
        </div>
      </Card>

      <section>
        <h2
          className="mb-2 text-xs font-bold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Badges
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {BADGE_TIERS.map((tier) => {
            const unlocked = isBadgeUnlocked(tier, streak.longestStreak)
            return (
              <Card
                key={tier.days}
                className="flex flex-col items-center gap-1 py-4 text-center"
                style={{ background: unlocked ? 'var(--color-surface)' : 'var(--color-surface-2)' }}
              >
                <span
                  aria-hidden="true"
                  className="text-3xl"
                  style={{ opacity: unlocked ? 1 : 0.6 }}
                >
                  {unlocked ? tier.icon : '🔒'}
                </span>
                <p
                  className="text-[13px] font-bold"
                  style={{ color: unlocked ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                >
                  {tier.name}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {tier.days} day{tier.days === 1 ? '' : 's'}
                </p>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
