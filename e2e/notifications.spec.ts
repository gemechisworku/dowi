import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import AxeBuilder from '@axe-core/playwright'

/**
 * Covers M7 (Notifications & reminders) end to end against real IndexedDB:
 * Settings → Reminders, the inbox, and a real catch-up-generated reminder
 * deep-linking to the right screen.
 *
 * Headless Chromium always reports Notification.permission as "denied" —
 * confirmed empirically, even with `context.grantPermissions(['notifications'])`
 * — so neither the 'default' explainer-dialog path nor a real 'granted'
 * OS-delivery path is reachable through Playwright here. Both are covered by
 * code review (scheduler.test.ts unit-tests the granted/denied/quiet-hours
 * delivery branches with the permission module mocked) plus the real-phone
 * manual pass in TESTING.md §M7. What's covered below — inbox entries
 * always being written regardless of permission, deep links, and every
 * Settings control — doesn't depend on which permission state is reachable.
 */

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TODAY_NAME = WEEKDAY_NAMES[new Date().getDay()]

function notificationsFixture(notifications: unknown[]) {
  const now = new Date().toISOString()
  return {
    formatVersion: 1,
    exportedAt: now,
    transactions: [],
    categories: [],
    sources: [],
    accounts: [],
    rates: [],
    notes: [],
    noteCollections: [],
    tasks: [],
    taskCollections: [],
    notifications,
    settings: {
      id: 'settings',
      baseCurrency: 'ETB',
      weekStartsOn: 1,
      fyStartMonth: 1,
      theme: 'system',
      textSize: 'm',
      density: 'comfortable',
      hideAmounts: false,
      reminders: {
        weeklyPlan: { enabled: false, day: 1, time: '08:00' },
        weeklyReview: { enabled: false, day: 6, time: '18:00' },
        taskDue: { enabled: false, offsets: [0, 1440] },
        dailyAgenda: { enabled: false, time: '07:30' },
        backupNudge: { enabled: false, intervalDays: 30 },
        morningNudge: { enabled: false, time: '09:00' },
        eveningStreak: { enabled: false, time: '21:00' },
        quietHours: { enabled: false, start: '22:00', end: '07:00' },
      },
    },
    meta: [{ key: 'seededAt', value: now }],
  }
}

async function importFixture(page: Page, fixture: unknown) {
  const fixturePath = join(tmpdir(), `dowi-notifications-fixture-${test.info().testId}.json`)
  writeFileSync(fixturePath, JSON.stringify(fixture))
  await page.goto('/debug/data')
  await page.getByLabel('Import JSON').setInputFiles(fixturePath)
  await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({ timeout: 15_000 })
}

test.describe('Settings — permission state', () => {
  test('shows the denied state honestly and does not re-prompt when a reminder is toggled', async ({
    page,
  }) => {
    await page.goto('/settings')
    await expect(page.getByText('Blocked', { exact: true })).toBeVisible()

    const taskDueSwitch = page.getByRole('switch', { name: 'Task due reminders' })
    await expect(taskDueSwitch).toBeChecked()
    await taskDueSwitch.click()
    await expect(taskDueSwitch).not.toBeChecked()
    await taskDueSwitch.click()

    // Already decided (denied) — turning the reminder back on proceeds
    // straight through rather than showing the permission explainer again.
    await expect(page.getByRole('dialog', { name: 'Allow notifications?' })).not.toBeVisible()
    await expect(taskDueSwitch).toBeChecked()
  })

  test('a test notification reports that it is blocked rather than claiming success', async ({
    page,
  }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Send a test notification' }).click()
    await expect(page.getByText('Notifications are blocked', { exact: false })).toBeVisible()
  })

  test('turning off quiet hours hides its time pickers, and the setting survives a reload', async ({
    page,
  }) => {
    await page.goto('/settings')
    await expect(page.getByLabel('Quiet hours start')).toBeVisible()

    await page.getByRole('switch', { name: 'Suppress OS notifications overnight' }).click()
    await expect(page.getByLabel('Quiet hours start')).not.toBeVisible()

    await page.reload()
    await expect(
      page.getByRole('switch', { name: 'Suppress OS notifications overnight' }),
    ).not.toBeChecked()
    await expect(page.getByLabel('Quiet hours start')).not.toBeVisible()
  })
})

test.describe('Reminder catch-up and inbox', () => {
  test('a due reminder is caught up on open, appears in the inbox, and opens a detail page whose action button deep-links — even without OS permission', async ({
    page,
  }) => {
    await page.goto('/settings')
    await page.getByLabel('Weekly plan day').selectOption({ label: TODAY_NAME })
    await page.getByLabel('Weekly plan time').fill('00:00')

    // Every reminder-settings change re-runs catch-up immediately (no
    // reload needed — see SettingsPage.tsx's patchReminders) against the
    // settings just saved. The inbox entry is written unconditionally (PRD
    // §5.7's reliability backstop) regardless of whether OS delivery
    // itself succeeds.
    await expect(page.getByLabel(/Notifications, \d+ unread/)).toBeVisible()

    await page.goto('/notifications')
    // Default settings can independently produce their own "Plan your week"
    // occurrence too (e.g. if today really is Monday) — either row proves
    // catch-up worked and deep-links to the same place.
    const row = page.getByText('Plan your week').first()
    await expect(row).toBeVisible()

    await row.click()
    await expect(page).toHaveURL(/\/notifications\/.+/)
    await expect(page.getByRole('heading', { name: 'Plan your week' })).toBeVisible()

    await page.getByRole('button', { name: 'Plan your week' }).click()
    await expect(page).toHaveURL(/\/tasks\/plan$/)
  })

  test('clear all empties the inbox', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('Weekly review day').selectOption({ label: TODAY_NAME })
    await page.getByLabel('Weekly review time').fill('00:00')

    await page.goto('/notifications')
    await expect(page.getByText('Review your week').first()).toBeVisible()

    await page.getByRole('button', { name: 'Clear all' }).click()
    await page.getByRole('button', { name: 'Clear all' }).last().click()

    await expect(page.getByText('No notifications yet')).toBeVisible()
  })

  test('a cleared reminder does not come back as a fresh, unread notification on the next catch-up', async ({
    page,
  }) => {
    await page.goto('/settings')
    await page.getByLabel('Weekly plan day').selectOption({ label: TODAY_NAME })
    await page.getByLabel('Weekly plan time').fill('00:00')

    await page.goto('/notifications')
    await expect(page.getByText('Plan your week').first()).toBeVisible()

    await page.getByRole('button', { name: 'Clear all' }).click()
    await page.getByRole('button', { name: 'Clear all' }).last().click()
    await expect(page.getByText('No notifications yet')).toBeVisible()

    // Reloading re-runs catch-up (useNotificationRuntime.ts) exactly like
    // reopening the app would — the same reminder's occurrence must not
    // look "never sent" again just because it was cleared from view.
    await page.reload()
    await expect(page.getByText('No notifications yet')).toBeVisible()
    await expect(page.getByLabel(/Notifications, \d+ unread/)).not.toBeVisible()
  })

  test('shows an empty state once every reminder is off and the inbox is cleared', async ({
    page,
  }) => {
    await page.goto('/settings')
    // Turn off every default-enabled reminder so catch-up has nothing more to raise.
    for (const name of [
      'Plan your week',
      'Review your week',
      'Task due reminders',
      'Backup nudge',
    ]) {
      const toggle = page.getByRole('switch', { name })
      if (await toggle.isChecked()) await toggle.click()
    }
    await page.reload()

    // The very first mount (before the loop above ran) may already have
    // raised a default-settings reminder — clear whatever's there so the
    // empty state itself is asserted deterministically.
    await page.goto('/notifications')
    const clearAll = page.getByRole('button', { name: 'Clear all' })
    if (await clearAll.isVisible()) {
      await clearAll.click()
      await page.getByRole('button', { name: 'Clear all' }).last().click()
    }
    await expect(page.getByText('No notifications yet')).toBeVisible()
  })
})

test.describe('Notification detail page', () => {
  test('shows the evening-summary breakdown and marks the notification read', async ({ page }) => {
    const scheduledFor = new Date().toISOString()
    await importFixture(
      page,
      notificationsFixture([
        {
          id: 'n-summary',
          type: 'evening-summary',
          title: 'Nice work today 🎉',
          body: 'Today: 2 transactions (net -ETB 20.00). Keep it up tomorrow!',
          scheduledFor,
          deepLink: '/',
          read: false,
          createdAt: scheduledFor,
          data: { txCount: 2, netMinorUnits: -2000, currency: 'ETB', tasksDone: 1, notesAdded: 0 },
        },
      ]),
    )

    await page.goto('/notifications')
    await expect(page.getByLabel(/Notifications, 1 unread/)).toBeVisible()
    await page.getByText('Nice work today 🎉').click()

    await expect(page).toHaveURL(/\/notifications\/n-summary$/)
    await expect(page.getByRole('heading', { name: 'Nice work today 🎉' })).toBeVisible()
    await expect(page.getByText('Transactions today')).toBeVisible()
    await expect(page.getByText('2', { exact: true })).toBeVisible()
    await expect(page.getByText('-ETB 20.00', { exact: true })).toBeVisible()
    await expect(page.getByText('Tasks done')).toBeVisible()
    await expect(page.getByText('Notes added')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Open Dowi' })).toBeVisible()

    // Marked read as a side effect of opening the detail page.
    await page.goto('/notifications')
    await expect(page.getByLabel(/Notifications, \d+ unread/)).not.toBeVisible()
  })

  test('shows the current-streak breakdown for an evening-streak reminder', async ({ page }) => {
    const scheduledFor = new Date().toISOString()
    await importFixture(
      page,
      notificationsFixture([
        {
          id: 'n-streak',
          type: 'evening-streak',
          title: "Don't lose your streak 🔥",
          body: "You're on a 12-day streak — don't let it end tonight.",
          scheduledFor,
          deepLink: '/',
          read: false,
          createdAt: scheduledFor,
          data: { currentStreak: 12 },
        },
      ]),
    )

    await page.goto('/notifications/n-streak')
    await expect(page.getByText('Current streak')).toBeVisible()
    await expect(page.getByText('12 days')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Log something' })).toBeVisible()
  })

  test('shows a not-found state for a cleared/unknown notification id', async ({ page }) => {
    await page.goto('/notifications/does-not-exist')
    await expect(page.getByText('Notification not found')).toBeVisible()
  })

  test('has zero automatically-detectable accessibility violations', async ({ page }) => {
    const scheduledFor = new Date().toISOString()
    await importFixture(
      page,
      notificationsFixture([
        {
          id: 'n-summary',
          type: 'evening-summary',
          title: 'Nice work today 🎉',
          body: 'Today: 2 transactions (net -ETB 20.00). Keep it up tomorrow!',
          scheduledFor,
          deepLink: '/',
          read: false,
          createdAt: scheduledFor,
          data: { txCount: 2, netMinorUnits: -2000, currency: 'ETB', tasksDone: 1, notesAdded: 0 },
        },
      ]),
    )

    await page.goto('/notifications/n-summary')
    await expect(page.getByRole('heading', { name: 'Nice work today 🎉' })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
