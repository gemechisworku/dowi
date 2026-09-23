import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import { formatMoney } from '@/lib/money'
import { getNotificationTypeCopy } from './notificationDetailCopy'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The notification detail page (PRD-adjacent, post-M9 polish): tapping an
 * inbox row lands here rather than jumping straight to its deep link, so
 * there's somewhere to show more than title/body — a type-specific
 * breakdown when the notification carries `data` — before a single,
 * explicit action button does the deep-linking `NotificationsInboxPage`
 * used to do directly.
 */
export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notificationsRepo } = useDatabase()
  const notifications = useLiveQuery(() => notificationsRepo.list(), [notificationsRepo])
  const notification = notifications?.find((n) => n.id === id)

  useEffect(() => {
    if (notification && !notification.read) void notificationsRepo.markRead(notification.id)
  }, [notification, notificationsRepo])

  if (notifications === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner label="Loading notification" size={28} />
      </div>
    )
  }

  if (!notification) {
    return (
      <div className="px-4 pt-2">
        <EmptyState
          icon="🔔"
          title="Notification not found"
          description="It may have already been cleared from your inbox."
        />
      </div>
    )
  }

  const copy = getNotificationTypeCopy(notification.type)
  const data = notification.data

  return (
    <div className="flex flex-col gap-4 px-4 pt-1 pb-6">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-3xl">
          {copy.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight">{notification.title}</h1>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {TIME_FORMATTER.format(new Date(notification.scheduledFor))}
          </p>
        </div>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
          {notification.body}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {copy.explanation}
        </p>
      </Card>

      {data && (data.currentStreak !== undefined || data.txCount !== undefined) && (
        <Card className="flex flex-col gap-2">
          {data.currentStreak !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>Current streak</span>
              <span className="font-semibold">{data.currentStreak} days</span>
            </div>
          )}
          {data.txCount !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>Transactions today</span>
              <span className="font-semibold">{data.txCount}</span>
            </div>
          )}
          {data.netMinorUnits !== undefined && data.currency && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>Net today</span>
              <span className="font-semibold">
                {formatMoney(data.netMinorUnits, data.currency, { showSign: true })}
              </span>
            </div>
          )}
          {!!data.tasksDone && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>Tasks done</span>
              <span className="font-semibold">{data.tasksDone}</span>
            </div>
          )}
          {!!data.notesAdded && (
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-text-muted)' }}>Notes added</span>
              <span className="font-semibold">{data.notesAdded}</span>
            </div>
          )}
        </Card>
      )}

      {notification.deepLink && (
        <Button fullWidth onClick={() => navigate(notification.deepLink as string)}>
          {copy.actionLabel}
        </Button>
      )}
    </div>
  )
}
