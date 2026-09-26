import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import AxeBuilder from '@axe-core/playwright'

/**
 * Covers the M13 streak/badges page (header 🔥 icon, month contribution
 * calendar, badge ladder) against real IndexedDB — seeded via /debug/data's
 * JSON import, same mechanism e2e/streaks.spec.ts uses, since a
 * deterministic streak + activity history is otherwise impossible
 * regardless of what day the suite actually runs on.
 */

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

interface StreakFixtureState {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
  lastCelebratedStreak: number
}

function fixture(streak: StreakFixtureState, activityLog: { date: string; count: number }[]) {
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
    notifications: [],
    meta: [
      { key: 'seededAt', value: now },
      { key: 'streak', value: JSON.stringify(streak) },
    ],
    activityLog,
  }
}

async function importFixture(page: Page, data: unknown) {
  const fixturePath = join(tmpdir(), `dowi-streak-badges-fixture-${test.info().testId}.json`)
  writeFileSync(fixturePath, JSON.stringify(data))
  await page.goto('/debug/data')
  await page.getByLabel('Import JSON').setInputFiles(fixturePath)
  await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({ timeout: 15_000 })
}

test.describe('Streaks & badges page', () => {
  test('the header 🔥 icon opens it', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Streaks and badges' }).click()
    await expect(page).toHaveURL('/streaks')
    await expect(page.getByRole('heading', { name: 'Streaks & Badges' })).toBeVisible()
  })

  test('shows current streak, longest streak and the badge count, and unlocks exactly the tiers reached', async ({
    page,
  }) => {
    await importFixture(
      page,
      fixture(
        {
          currentStreak: 6,
          longestStreak: 35,
          lastActiveDate: isoDaysAgo(0),
          lastCelebratedStreak: 35,
        },
        [{ date: isoDaysAgo(0), count: 2 }],
      ),
    )

    await page.goto('/streaks')

    await expect(page.getByText('6', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('35', { exact: true })).toBeVisible()
    await expect(page.getByText('5/9')).toBeVisible()

    // 3, 7, 14, 21, 30-day tiers reached at longestStreak=35; 60+ not yet.
    for (const name of ['Spark', 'Week One', 'Fortnight', 'Habit Formed', 'Month Strong']) {
      const card = page.getByText(name, { exact: true }).locator('..')
      await expect(card.getByText('🔒')).not.toBeVisible()
    }
    for (const name of ['Two Months', 'Century Club', 'Half Year', 'Year One']) {
      const card = page.getByText(name, { exact: true }).locator('..')
      await expect(card.getByText('🔒')).toBeVisible()
    }
  })

  test('the calendar reflects logged activity and marks today', async ({ page }) => {
    const today = isoDaysAgo(0)
    await importFixture(
      page,
      fixture(
        { currentStreak: 1, longestStreak: 1, lastActiveDate: today, lastCelebratedStreak: 0 },
        [{ date: today, count: 4 }],
      ),
    )

    await page.goto('/streaks')

    const todayCell = page.getByRole('gridcell', { name: /\(today\)/ })
    await expect(todayCell).toBeVisible()
    await expect(todayCell).toHaveAttribute('aria-label', /4 actions/)
    await expect(todayCell).toHaveAttribute('aria-label', /part of your current streak/)
  })

  test('month navigation steps between months', async ({ page }) => {
    await page.goto('/streaks')
    const label = page.locator('text=/^\\w+ \\d{4}$/').first()
    const initialLabel = await label.textContent()

    await page.getByRole('button', { name: 'Previous period' }).click()
    await expect(label).not.toHaveText(initialLabel ?? '')

    await page.getByRole('button', { name: 'Next period' }).click()
    await expect(label).toHaveText(initialLabel ?? '')
  })

  test('has zero automatically-detectable accessibility violations', async ({ page }) => {
    await importFixture(
      page,
      fixture(
        {
          currentStreak: 6,
          longestStreak: 35,
          lastActiveDate: isoDaysAgo(0),
          lastCelebratedStreak: 35,
        },
        [
          { date: isoDaysAgo(0), count: 2 },
          { date: isoDaysAgo(3), count: 5 },
        ],
      ),
    )
    await page.goto('/streaks')
    await expect(page.getByRole('heading', { name: 'Streaks & Badges' })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
