import { test, expect } from '@playwright/test'

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
  test('a due reminder is caught up on open, appears in the inbox, and its deep link works — even without OS permission', async ({
    page,
  }) => {
    await page.goto('/settings')
    await page.getByLabel('Weekly plan day').selectOption({ label: TODAY_NAME })
    await page.getByLabel('Weekly plan time').fill('00:00')

    // A fresh mount re-runs catch-up against the settings just saved. The
    // inbox entry is written unconditionally (PRD §5.7's reliability
    // backstop) regardless of whether OS delivery itself succeeds.
    await page.reload()
    await expect(page.getByLabel(/Notifications, \d+ unread/)).toBeVisible()

    await page.goto('/notifications')
    // Default settings can independently produce their own "Plan your week"
    // occurrence too (e.g. if today really is Monday) — either row proves
    // catch-up worked and deep-links to the same place.
    const row = page.getByText('Plan your week').first()
    await expect(row).toBeVisible()

    await row.click()
    await expect(page).toHaveURL(/\/tasks\/plan$/)
  })

  test('clear all empties the inbox', async ({ page }) => {
    await page.goto('/settings')
    await page.getByLabel('Weekly review day').selectOption({ label: TODAY_NAME })
    await page.getByLabel('Weekly review time').fill('00:00')
    await page.reload()

    await page.goto('/notifications')
    await expect(page.getByText('Review your week').first()).toBeVisible()

    await page.getByRole('button', { name: 'Clear all' }).click()
    await page.getByRole('button', { name: 'Clear all' }).last().click()

    await expect(page.getByText('No notifications yet')).toBeVisible()
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
