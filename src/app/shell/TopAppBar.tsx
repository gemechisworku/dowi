import { useNavigate } from 'react-router'

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
