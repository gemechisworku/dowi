import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { AppNotification, NotificationType } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { Button } from '@/components/ui/Button'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/useSnackbar'

const TYPE_ICON: Record<NotificationType, string> = {
  'weekly-plan': '🗓️',
  'weekly-review': '📋',
  'task-due': '✅',
  'daily-agenda': '☀️',
  'backup-nudge': '💾',
}

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The in-app notification inbox (PRD §5.7) — every reminder Dowi raises is
 * written here regardless of whether the OS notification actually fired,
 * so this is the reliability backstop, not just a log.
 */
export function NotificationsInboxPage() {
  const { notificationsRepo } = useDatabase()
  const navigate = useNavigate()
  const { show } = useSnackbar()
  const notifications = useLiveQuery(
    () => notificationsRepo.list(),
    [notificationsRepo],
    EMPTY_ARRAY,
  )
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleOpen(notification: AppNotification) {
    if (!notification.read) await notificationsRepo.markRead(notification.id)
    if (notification.deepLink) navigate(notification.deepLink)
  }

  async function handleClear(notification: AppNotification) {
    await notificationsRepo.clear(notification.id)
    show({ message: 'Notification cleared' })
  }

  async function handleClearAll() {
    setConfirmClearAll(false)
    await notificationsRepo.clearAll()
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-1">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold tracking-tight">Notifications</h1>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => notificationsRepo.markAllRead()}>
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setConfirmClearAll(true)}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications yet"
          description="Reminders you enable in Settings will show up here, whether or not they reach the OS notification tray."
        />
      ) : (
        <Card className="divide-y p-0" style={{ borderColor: 'var(--color-border)' }}>
          {notifications.map((notification) => (
            <SwipeableRow key={notification.id} onSwipeLeft={() => handleClear(notification)}>
              <ListItem
                onClick={() => handleOpen(notification)}
                leading={
                  <span aria-hidden="true" className="text-xl">
                    {TYPE_ICON[notification.type]}
                  </span>
                }
                title={
                  <span style={{ fontWeight: notification.read ? 500 : 700 }}>
                    {notification.title}
                  </span>
                }
                subtitle={notification.body}
                trailing={
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {TIME_FORMATTER.format(new Date(notification.scheduledFor))}
                    </span>
                    {!notification.read && (
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full"
                        style={{ background: 'var(--color-primary)' }}
                      />
                    )}
                  </div>
                }
              />
            </SwipeableRow>
          ))}
        </Card>
      )}

      <ConfirmDialog
        open={confirmClearAll}
        title="Clear all notifications?"
        description="This removes every notification from your inbox. This can't be undone."
        confirmLabel="Clear all"
        danger
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  )
}
