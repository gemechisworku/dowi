import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import AxeBuilder from '@axe-core/playwright'

/**
 * Covers the post-M9 daily-streak celebration and Home's usage-week header
 * against real IndexedDB — seeded via `/debug/data`'s JSON import (same
 * mechanism `home.spec.ts`/`reports-perf.spec.ts` use), since it's the only
 * way to get a deterministic streak state and install date independent of
 * whatever day the suite actually runs on.
 */

const CATEGORY_ID = 'cat-food'

interface StreakFixtureState {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
  lastCelebratedStreak: number
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function streakFixture(streak: StreakFixtureState, installedAt = new Date().toISOString()) {
  const now = new Date().toISOString()
  return {
    formatVersion: 1,
    exportedAt: now,
    transactions: [],
    categories: [
      {
        id: CATEGORY_ID,
        createdAt: now,
        updatedAt: now,
        name: 'Food',
        icon: '🍔',
        color: '#000',
        type: 'expense',
      },
    ],
    sources: [],
    accounts: [],
    rates: [],
    notes: [],
    noteCollections: [],
    tasks: [],
    taskCollections: [],
    notifications: [],
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
    meta: [
      { key: 'seededAt', value: installedAt },
      { key: 'streak', value: JSON.stringify(streak) },
    ],
  }
}

async function importFixture(page: Page, fixture: unknown) {
  const fixturePath = join(tmpdir(), `dowi-streak-fixture-${test.info().testId}.json`)
  writeFileSync(fixturePath, JSON.stringify(fixture))
  await page.goto('/debug/data')
  await page.getByLabel('Import JSON').setInputFiles(fixturePath)
  await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({ timeout: 15_000 })
}

async function addExpense(page: Page) {
  await page.goto('/money/transactions')
  await page.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  for (const key of ['1', '0', '0'])
    await page.getByRole('button', { name: key, exact: true }).click()
  await page.getByRole('button', { name: /Food/ }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test.describe('Daily streak celebration', () => {
  test('a qualifying action that crosses a 7-day streak shows the celebration once, and dismissing it persists', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 6,
        longestStreak: 6,
        lastActiveDate: isoDaysAgo(1),
        lastCelebratedStreak: 0,
      }),
    )

    await addExpense(page)

    const celebration = page.getByRole('alertdialog', { name: '7-day streak! 🔥' })
    await expect(celebration).toBeVisible()
    await expect(page.getByText("You've used Dowi 7 days in a row.")).toBeVisible()
    await celebration.getByRole('button', { name: 'Nice!' }).click()
    await expect(celebration).not.toBeVisible()

    // Dismissal is persisted (lastCelebratedStreak), not just local state —
    // a reload must not resurrect the same milestone.
    await page.reload()
    await expect(page.getByRole('alertdialog', { name: '7-day streak! 🔥' })).not.toBeVisible()
  })

  test('a qualifying action that does not cross a multiple of 7 shows no celebration', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 3,
        longestStreak: 3,
        lastActiveDate: isoDaysAgo(1),
        lastCelebratedStreak: 0,
      }),
    )

    await addExpense(page)

    await expect(page.getByRole('alertdialog')).not.toBeVisible()
  })

  test('a same-day repeat action does not re-trigger an already-celebrated milestone', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 7,
        longestStreak: 7,
        lastActiveDate: isoDaysAgo(0),
        lastCelebratedStreak: 7,
      }),
    )

    await addExpense(page)

    await expect(page.getByRole('alertdialog')).not.toBeVisible()
  })

  test('has zero automatically-detectable accessibility violations while open', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 6,
        longestStreak: 6,
        lastActiveDate: isoDaysAgo(1),
        lastCelebratedStreak: 0,
      }),
    )

    await addExpense(page)
    await expect(page.getByRole('alertdialog', { name: '7-day streak! 🔥' })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Daily streak reward overlay', () => {
  test('shows once after a qualifying action, is dismissible, and does not reappear on reload the same day', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 3,
        longestStreak: 3,
        lastActiveDate: isoDaysAgo(1),
        lastCelebratedStreak: 0,
      }),
    )

    await addExpense(page)

    const overlay = page.getByRole('button', { name: '4-day streak — dismiss' })
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('4-day streak')

    await overlay.click()
    await expect(overlay).not.toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: /-day streak — dismiss/ })).not.toBeVisible()
  })

  test('defers to the bigger milestone celebration on a 7-day day — no double reward UI', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 6,
        longestStreak: 6,
        lastActiveDate: isoDaysAgo(1),
        lastCelebratedStreak: 0,
      }),
    )

    await addExpense(page)

    await expect(page.getByRole('alertdialog', { name: '7-day streak! 🔥' })).toBeVisible()
    await expect(page.getByRole('button', { name: /-day streak — dismiss/ })).not.toBeVisible()
  })

  test('has zero automatically-detectable accessibility violations while open', async ({
    page,
  }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 3,
        longestStreak: 3,
        lastActiveDate: isoDaysAgo(1),
        lastCelebratedStreak: 0,
      }),
    )

    await addExpense(page)
    await expect(page.getByRole('button', { name: '4-day streak — dismiss' })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Home — usage week', () => {
  test('shows week 1 on the day the app is first used', async ({ page }) => {
    await importFixture(
      page,
      streakFixture({
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        lastCelebratedStreak: 0,
      }),
    )
    await page.goto('/')
    await expect(page.getByText(/Week 1 ·/)).toBeVisible()
  })

  test('shows week 2 once 8+ days have passed since install, independent of the real calendar week', async ({
    page,
  }) => {
    const installedAt = new Date(Date.now() - 8 * 86_400_000).toISOString()
    await importFixture(
      page,
      streakFixture(
        { currentStreak: 0, longestStreak: 0, lastActiveDate: null, lastCelebratedStreak: 0 },
        installedAt,
      ),
    )
    await page.goto('/')
    await expect(page.getByText(/Week 2 ·/)).toBeVisible()
  })
})
