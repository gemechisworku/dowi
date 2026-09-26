import { useNavigate } from 'react-router'
import { useTheme } from '@/app/theme/useTheme'
import type { ThemePreference } from '@/app/theme/ThemeContext'
import { useDatabase } from '@/app/db/useDatabase'

const THEME_CYCLE: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}
const THEME_ICON: Record<ThemePreference, string> = {
  system: '🌓',
  light: '☀️',
  dark: '🌙',
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
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
          >
            ‹
          </button>
        )}
        {title && <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Switch to ${THEME_LABEL[nextPreference]} theme (currently ${THEME_LABEL[preference]})`}
          onClick={handleThemeCycle}
          className="flex h-9 w-9 items-center justify-center rounded-full text-base"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          {THEME_ICON[preference]}
        </button>
        <button
          type="button"
          aria-label="Streaks and badges"
          onClick={() => navigate('/streaks')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-base"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          🔥
        </button>
        <button
          type="button"
          aria-label={
            unreadNotifications > 0
              ? `Notifications, ${unreadNotifications} unread`
              : 'Notifications'
          }
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-base"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          🔔
          {unreadNotifications > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
              style={{
                background: 'var(--color-expense)',
                border: '2px solid var(--color-surface)',
              }}
            />
          )}
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-base"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
        >
          ⚙️
        </button>
      </div>
    </header>
  )
}
