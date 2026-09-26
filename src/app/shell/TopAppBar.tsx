import { useNavigate } from 'react-router'
import { useTheme } from '@/app/theme/useTheme'
import type { ThemePreference } from '@/app/theme/ThemeContext'
import { useDatabase } from '@/app/db/useDatabase'
import { cn } from '@/lib/cn'

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

  // Option E "Bold Brand Header" (chosen from the 5-option comparison): a
  // solid --color-primary band, rounded only at the bottom, carries the app
  // bar on every screen. Icon buttons are ghost circles tinted with the
  // page's own foreground colour rather than surface cards with a shadow —
  // there's no card to elevate off of when the header IS the coloured
  // surface. The badge dot's ring is set to match this header's own
  // background (not --color-surface) so it still reads as a ring cut into
  // the bar instead of a mismatched white halo.
  const iconButtonClass =
    'flex h-9 w-9 items-center justify-center rounded-full text-base transition-colors active:scale-95'
  const iconButtonStyle = { background: 'rgba(255, 255, 255, 0.18)' }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 pt-[max(10px,env(safe-area-inset-top))] pb-3"
      style={{
        background: 'var(--color-primary)',
        color: 'var(--color-primary-fg)',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className={cn(iconButtonClass, 'text-lg')}
            style={iconButtonStyle}
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
          className={iconButtonClass}
          style={iconButtonStyle}
        >
          {THEME_ICON[preference]}
        </button>
        <button
          type="button"
          aria-label="Streaks and badges"
          onClick={() => navigate('/streaks')}
          className={iconButtonClass}
          style={iconButtonStyle}
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
          className={cn('relative', iconButtonClass)}
          style={iconButtonStyle}
        >
          🔔
          {unreadNotifications > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
              style={{
                background: 'var(--color-expense)',
                border: '2px solid var(--color-primary)',
              }}
            />
          )}
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className={iconButtonClass}
          style={iconButtonStyle}
        >
          ⚙️
        </button>
      </div>
    </header>
  )
}
