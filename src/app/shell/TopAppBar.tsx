import { useNavigate } from 'react-router'
import { useTheme } from '@/app/theme/useTheme'
import type { ThemePreference } from '@/app/theme/ThemeContext'
import { useDatabase } from '@/app/db/useDatabase'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'

const THEME_CYCLE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}
const THEME_ICON: Record<ThemePreference, AppIconName> = {
  system: 'system',
  light: 'sun',
  dark: 'moon',
}
const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'system',
  light: 'light',
  dark: 'dark',
}

interface TopAppBarProps {
  /** Screen title. Omit for routes that render their own large heading. */
  title?: string
  /** Shows a back arrow instead of the notification bell / settings cluster. */
  showBack?: boolean
  unreadNotifications?: number
}

/**
 * Top bar per Option A: title/back on the left, notification bell (with
 * unread badge) and a settings entry on the right. Detail/editor screens
 * pass showBack to swap in a back arrow.
 */
export function TopAppBar({ title, showBack = false, unreadNotifications = 0 }: TopAppBarProps) {
  const navigate = useNavigate()
  const { preference, setPreference } = useTheme()
  const { settingsRepo } = useDatabase()
  const nextPreference = THEME_CYCLE[preference]

  // Mirrors Settings → Appearance's own theme control: ThemeProvider's
  // localStorage preference stays the actual source of truth for what's
  // rendered (applied before React mounts, to avoid a flash), and this
  // additionally writes the choice into Settings.theme purely so it
  // travels with an exported/imported backup — see AppearanceSettings.tsx.
  function handleThemeCycle() {
    setPreference(nextPreference)
    void settingsRepo.update({ theme: nextPreference })
  }

  return (
    <header className="dowi-brand-gradient sticky top-0 z-30 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
      <div className="flex items-center justify-between gap-3 px-1 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-[12px]"
            style={{ background: 'var(--color-on-brand-surface)' }}
          >
            <AppIcon name="arrow-left" className="h-5 w-5" />
          </button>
        )}
        {!showBack && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[var(--color-on-brand-surface-strong)] font-bold text-[var(--blue-700)]">D</span>}
        <div className="min-w-0"><p className="truncate text-[15px] font-semibold text-[var(--color-on-brand)]">{title ?? 'Dowi'}</p>{!title&&<p className="truncate text-[11px] text-[var(--color-on-brand-muted)]">Your day, in one place</p>}</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Switch to ${THEME_LABEL[nextPreference]} theme (currently ${THEME_LABEL[preference]})`}
          onClick={handleThemeCycle}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-on-brand-muted)]"
        >
          <AppIcon name={THEME_ICON[preference]} className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Streaks and badges"
          onClick={() => navigate('/streaks')}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-on-brand-muted)]"
        >
          <AppIcon name="flame" className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label={
            unreadNotifications > 0
              ? `Notifications, ${unreadNotifications} unread`
              : 'Notifications'
          }
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-on-brand-muted)]"
        >
          <AppIcon name="bell" className="h-[18px] w-[18px]" />
          {unreadNotifications > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
              style={{
                background: 'var(--color-expense)',
                border: '2px solid var(--color-on-brand)',
              }}
            />
          )}
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[var(--color-on-brand-muted)]"
        >
          <AppIcon name="settings" className="h-[18px] w-[18px]" />
        </button>
      </div>
      </div>
    </header>
  )
}
