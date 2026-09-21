import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { ReminderConfig, Settings } from '@/db/types'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'
import { createWebScheduler } from '@/notifications/scheduler'
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '@/notifications/permission'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Switch } from '@/components/ui/Switch'
import { Select } from '@/components/ui/Select'
import { TimePicker } from '@/components/ui/TimePicker'
import { NumericInput } from '@/components/ui/NumericInput'
import { Button } from '@/components/ui/Button'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/useSnackbar'

const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const PERMISSION_LABEL: Record<NotificationPermissionState, string> = {
  granted: 'Allowed',
  denied: 'Blocked',
  default: 'Not decided yet',
  unsupported: 'Not supported on this device',
}

const PERMISSION_TONE: Record<NotificationPermissionState, BadgeTone> = {
  granted: 'income',
  denied: 'expense',
  default: 'warning',
  unsupported: 'neutral',
}

type ReminderKey = keyof Pick<
  ReminderConfig,
  'weeklyPlan' | 'weeklyReview' | 'taskDue' | 'dailyAgenda' | 'backupNudge'
>

/**
 * Settings → Reminders (PRD §5.7/§5.8). This screen covers only what M7
 * needs — Appearance/Money/Data/About land with the rest of Settings later.
 */
export function SettingsPage() {
  const { db, settingsRepo, notificationsRepo, repos } = useDatabase()
  const { show } = useSnackbar()
  const settings = useLiveQuery(
    () => settingsRepo.get(),
    [settingsRepo],
    DEFAULT_SETTINGS,
  ) as Settings
  const scheduler = useMemo(
    () => createWebScheduler({ db, settingsRepo, notificationsRepo, tasksRepo: repos.tasks }),
    [db, settingsRepo, notificationsRepo, repos],
  )

  const [permission, setPermission] = useState(getNotificationPermission)
  const [explainerOpen, setExplainerOpen] = useState(false)
  const [pendingEnable, setPendingEnable] = useState<ReminderKey | null>(null)
  const [sendingTest, setSendingTest] = useState(false)

  async function patchReminders(patch: Partial<ReminderConfig>) {
    await settingsRepo.update({ reminders: { ...settings.reminders, ...patch } })
  }

  async function ensurePermissionThenEnable(key: ReminderKey) {
    if (getNotificationPermission() === 'default') {
      setPendingEnable(key)
      setExplainerOpen(true)
      return
    }
    await patchReminders({ [key]: { ...settings.reminders[key], enabled: true } })
  }

  async function handleExplainerContinue() {
    setExplainerOpen(false)
    const result = await requestNotificationPermission()
    setPermission(result)
    if (pendingEnable) {
      await patchReminders({
        [pendingEnable]: { ...settings.reminders[pendingEnable], enabled: true },
      })
    }
    setPendingEnable(null)
  }

  function handleExplainerCancel() {
    setExplainerOpen(false)
    setPendingEnable(null)
  }

  function handleToggle(key: ReminderKey, enabled: boolean) {
    if (enabled) {
      void ensurePermissionThenEnable(key)
      return
    }
    void patchReminders({ [key]: { ...settings.reminders[key], enabled: false } })
  }

  async function handleSendTest() {
    setSendingTest(true)
    try {
      const { delivered, permission: result } = await scheduler.sendTest()
      setPermission(result)
      if (result !== 'granted') {
        show({
          message: 'Notifications are blocked — allow them in your browser/OS settings first.',
        })
        return
      }
      show({
        message: delivered ? 'Test notification sent' : "Couldn't send it — try again in a moment.",
      })
    } finally {
      setSendingTest(false)
    }
  }

  const { reminders } = settings

  return (
    <div className="flex flex-col gap-6 px-4 pt-1 pb-6">
      <h1 className="text-lg font-bold tracking-tight">Settings</h1>

      <section>
        <SectionHeader title="Notifications" />
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px]" style={{ color: 'var(--color-text)' }}>
              Permission status
            </p>
            <Badge tone={PERMISSION_TONE[permission]}>{PERMISSION_LABEL[permission]}</Badge>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Dowi asks for notification permission the first time you turn on a reminder below, not
            when you first open the app. Every reminder also always appears in your notification
            inbox, even if the OS notification itself is blocked or arrives late.
          </p>
          <Button variant="secondary" onClick={handleSendTest} loading={sendingTest}>
            Send a test notification
          </Button>
        </Card>
      </section>

      <section>
        <SectionHeader title="Reminders" />
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Switch
              label="Plan your week"
              checked={reminders.weeklyPlan.enabled}
              onChange={(e) => handleToggle('weeklyPlan', e.target.checked)}
            />
            {reminders.weeklyPlan.enabled && (
              <div className="grid grid-cols-2 gap-2 pl-1">
                <Select
                  aria-label="Weekly plan day"
                  options={DAY_OPTIONS}
                  value={String(reminders.weeklyPlan.day)}
                  onChange={(e) =>
                    patchReminders({
                      weeklyPlan: { ...reminders.weeklyPlan, day: Number(e.target.value) },
                    })
                  }
                />
                <TimePicker
                  aria-label="Weekly plan time"
                  value={reminders.weeklyPlan.time}
                  onChange={(e) =>
                    patchReminders({
                      weeklyPlan: { ...reminders.weeklyPlan, time: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Switch
              label="Review your week"
              checked={reminders.weeklyReview.enabled}
              onChange={(e) => handleToggle('weeklyReview', e.target.checked)}
            />
            {reminders.weeklyReview.enabled && (
              <div className="grid grid-cols-2 gap-2 pl-1">
                <Select
                  aria-label="Weekly review day"
                  options={DAY_OPTIONS}
                  value={String(reminders.weeklyReview.day)}
                  onChange={(e) =>
                    patchReminders({
                      weeklyReview: { ...reminders.weeklyReview, day: Number(e.target.value) },
                    })
                  }
                />
                <TimePicker
                  aria-label="Weekly review time"
                  value={reminders.weeklyReview.time}
                  onChange={(e) =>
                    patchReminders({
                      weeklyReview: { ...reminders.weeklyReview, time: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Switch
              label="Daily agenda"
              checked={reminders.dailyAgenda.enabled}
              onChange={(e) => handleToggle('dailyAgenda', e.target.checked)}
            />
            {reminders.dailyAgenda.enabled && (
              <div className="pl-1">
                <TimePicker
                  aria-label="Daily agenda time"
                  value={reminders.dailyAgenda.time}
                  onChange={(e) =>
                    patchReminders({
                      dailyAgenda: { ...reminders.dailyAgenda, time: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Switch
              label="Task due reminders"
              checked={reminders.taskDue.enabled}
              onChange={(e) => handleToggle('taskDue', e.target.checked)}
            />
            <p className="pl-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              How far ahead each reminder fires is set per task, from its own edit sheet.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Switch
              label="Backup nudge"
              checked={reminders.backupNudge.enabled}
              onChange={(e) => handleToggle('backupNudge', e.target.checked)}
            />
            {reminders.backupNudge.enabled && (
              <div className="flex items-center gap-2 pl-1">
                <NumericInput
                  aria-label="Backup nudge interval, in days"
                  decimals={0}
                  value={String(reminders.backupNudge.intervalDays)}
                  onValueChange={(raw) =>
                    patchReminders({
                      backupNudge: { ...reminders.backupNudge, intervalDays: Number(raw) || 1 },
                    })
                  }
                  className="w-20"
                />
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  days since your last export
                </span>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Quiet hours" />
        <Card className="flex flex-col gap-3">
          <Switch
            label="Suppress OS notifications overnight"
            checked={reminders.quietHours.enabled}
            onChange={(e) =>
              patchReminders({ quietHours: { ...reminders.quietHours, enabled: e.target.checked } })
            }
          />
          {reminders.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-2 pl-1">
              <TimePicker
                aria-label="Quiet hours start"
                value={reminders.quietHours.start}
                onChange={(e) =>
                  patchReminders({ quietHours: { ...reminders.quietHours, start: e.target.value } })
                }
              />
              <TimePicker
                aria-label="Quiet hours end"
                value={reminders.quietHours.end}
                onChange={(e) =>
                  patchReminders({ quietHours: { ...reminders.quietHours, end: e.target.value } })
                }
              />
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Reminders due during quiet hours still land in your notification inbox — they just don't
            ping the OS.
          </p>
        </Card>
      </section>

      <ConfirmDialog
        open={explainerOpen}
        title="Allow notifications?"
        description="Dowi can remind you to plan and review your week, and nudge you about tasks that are due. You can turn this off any time — allowing it now just lets the reminder actually reach your notification tray, on top of always showing up in the in-app inbox."
        confirmLabel="Continue"
        onConfirm={handleExplainerContinue}
        onCancel={handleExplainerCancel}
      />
    </div>
  )
}
