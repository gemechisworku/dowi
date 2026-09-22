import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import AxeBuilder from '@axe-core/playwright'

/**
 * Covers the M8 Home screen end to end against real IndexedDB. Data is
 * seeded via `/debug/data`'s JSON import (same mechanism `reports-perf.spec.ts`
 * uses) rather than driven through each feature's own add-sheet — it's the
 * only way to get deterministic due-dates/edit-recency/reminder-day config
 * without depending on "today" lining up with a hardcoded fixture date.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** An ISO datetime `daysAgo` days before now, at a fixed hour so ordering within a day is deterministic. */
function isoAt(daysAgo: number, hour = 9): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const NOW = new Date().toISOString()

function baseSettings(overrides: { weeklyPlanDay: number; weeklyReviewDay: number }) {
  return {
    id: 'settings',
    baseCurrency: 'ETB',
    weekStartsOn: 1,
    fyStartMonth: 1,
    theme: 'system',
    textSize: 'm',
    hideAmounts: false,
    reminders: {
      weeklyPlan: { enabled: true, day: overrides.weeklyPlanDay, time: '08:00' },
      weeklyReview: { enabled: true, day: overrides.weeklyReviewDay, time: '18:00' },
      taskDue: { enabled: true, offsets: [0, 1440] },
      dailyAgenda: { enabled: false, time: '07:30' },
      backupNudge: { enabled: true, intervalDays: 30 },
      quietHours: { enabled: true, start: '22:00', end: '07:00' },
    },
  }
}

interface FixtureOptions {
  weeklyPlanDay: number
  weeklyReviewDay: number
}

function buildFixture(opts: FixtureOptions) {
  const today = todayIso()

  const transactions = [
    {
      id: 'home-tx-income',
      type: 'income',
      amountMinorUnits: 20000, // ETB 200.00
      currency: 'ETB',
      date: today,
      categoryId: 'cat-salary',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'home-tx-expense',
      type: 'expense',
      amountMinorUnits: 7500, // ETB 75.00
      currency: 'ETB',
      date: today,
      categoryId: 'cat-food',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]

  const categories = [
    {
      id: 'cat-salary',
      name: 'Salary',
      icon: '💰',
      color: 'var(--color-income)',
      type: 'income',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'cat-food',
      name: 'Food',
      icon: '🍔',
      color: 'var(--color-expense)',
      type: 'expense',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]

  // 3 overdue + 4 due-today = 7 "today-relevant" tasks — one more than
  // Home's 5-item cap, so the "+N more" affordance and the overdue badge
  // (which must count all 3, not just however many make the cut) both get
  // exercised.
  const overdueTasks = ['A', 'B', 'C'].map((label, i) => ({
    id: `overdue-${label}`,
    title: `Overdue ${label}`,
    subtasks: [],
    priority: 'none',
    status: 'todo',
    reminderOffsets: [],
    dueAt: isoAt(i + 1),
    createdAt: NOW,
    updatedAt: NOW,
  }))
  const dueTodayTasks = ['A', 'B', 'C', 'D'].map((label, i) => ({
    id: `due-today-${label}`,
    title: `Due today ${label}`,
    subtasks: [],
    priority: 'none',
    status: 'todo',
    reminderOffsets: [],
    dueAt: `${today}T${String(8 + i).padStart(2, '0')}:00:00.000Z`,
    createdAt: NOW,
    updatedAt: NOW,
  }))

  // 5 notes, edited on 5 different days; `createdAt` deliberately
  // decoupled from `updatedAt` (the least-recently-edited note is the most
  // recently *created* one) so "recent" can only pass if it's really
  // sorting by updatedAt.
  const notes = [0, 1, 2, 3, 4].map((daysAgo) => ({
    id: `note-${daysAgo}`,
    title: daysAgo === 0 ? 'Note updated today' : `Note updated ${daysAgo} days ago`,
    contentJSON: 'placeholder',
    contentText: `Body text for the note updated ${daysAgo} days ago, used to check the snippet.`,
    tags: [],
    pinned: false,
    createdAt: isoAt(4 - daysAgo), // inverse of updatedAt recency
    updatedAt: isoAt(daysAgo),
  }))

  return {
    formatVersion: 1,
    exportedAt: NOW,
    transactions,
    categories,
    sources: [],
    accounts: [],
    rates: [],
    notes,
    noteCollections: [],
    tasks: [...overdueTasks, ...dueTodayTasks],
    taskCollections: [],
    notifications: [],
    settings: baseSettings(opts),
    // Without a "seededAt" meta row, `seedIfNeeded()` (src/db/seed.ts) sees
    // an apparently-fresh database on the very next full page load (Home's
    // own tests reload/navigate after import) and re-seeds `DEFAULT_SETTINGS`
    // straight over the custom `reminders` config above.
    meta: [{ key: 'seededAt', value: NOW }],
  }
}

async function importFixture(page: Page, fixture: unknown) {
  const fixturePath = join(tmpdir(), `dowi-home-fixture-${test.info().testId}.json`)
  writeFileSync(fixturePath, JSON.stringify(fixture))
  await page.goto('/debug/data')
  await page.getByLabel('Import JSON').setInputFiles(fixturePath)
  await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({ timeout: 15_000 })
}

// A day guaranteed not to be today, for fixtures that want the plan/review
// banner to stay hidden.
const NOT_TODAY = (new Date().getDay() + 3) % 7
const TODAY_DOW = new Date().getDay()

test.describe('Home — empty state', () => {
  test('a fresh database shows the real dashboard at zero, not a takeover screen', async ({
    page,
  }) => {
    await page.goto('/')
    // The dashboard itself renders — hero at zero, quick actions, and each
    // card's own empty state — rather than being replaced by anything. Net
    // at exactly zero gets no +/- prefix (see MoneyText/formatMoney: the
    // sign is only ever added for a strictly positive or negative amount).
    await expect(page.getByText('ETB 0.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Expense', exact: true })).toBeVisible()
    await expect(page.getByText('Nothing due today')).toBeVisible()
    await expect(page.getByText('No notes yet')).toBeVisible()
    // Plus the brief entry point into the guided tour.
    await expect(page.getByText('New here?', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Take the tour' })).toBeVisible()
  })

  test('the tour walks through all 3 categories and their steps', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Take the tour' }).click()

    const tour = page.getByRole('dialog', { name: 'Getting started' })
    await expect(tour.getByText('Log income & expenses')).toBeVisible()
    await expect(tour.getByRole('button', { name: 'Back' })).toHaveCount(0)

    await tour.getByRole('button', { name: 'Next' }).click()
    await expect(tour.getByText('See your reports')).toBeVisible()
    await tour.getByRole('button', { name: 'Next' }).click()
    await expect(tour.getByText('Capture and organize')).toBeVisible()

    // The category switcher jumps straight to a section's first step.
    await tour.getByRole('radio', { name: /Notes/ }).click()
    await expect(tour.getByText('Write freely')).toBeVisible()

    await tour.getByRole('button', { name: 'Next' }).click()
    await expect(tour.getByText('Find things fast')).toBeVisible()
    // Last step: no "Next", a "Done" instead.
    await expect(tour.getByRole('button', { name: 'Next' })).toHaveCount(0)
    await expect(tour.getByRole('button', { name: 'Done' })).toBeVisible()
  })

  test('finishing or skipping the tour dismisses it permanently, across a reload', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Take the tour' }).click()
    await page.getByRole('button', { name: 'Skip' }).click()
    await expect(page.getByRole('dialog', { name: 'Getting started' })).toHaveCount(0)
    await expect(page.getByText('New here?', { exact: true })).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('New here?', { exact: true })).toHaveCount(0)
  })

  test('dismissing the callout without opening the tour also hides it permanently', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByText('New here?', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss getting-started tips' }).click()
    await expect(page.getByText('New here?', { exact: true })).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('New here?', { exact: true })).toHaveCount(0)
  })

  test('the callout disappears on its own once there is any data, without being dismissed', async ({
    page,
  }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
    await expect(page.getByText('New here?', { exact: true })).toHaveCount(0)
  })
})

test.describe('Home — money summary', () => {
  test.beforeEach(async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
  })

  test('income, expense and net match a same-period Reports load exactly', async ({ page }) => {
    // Home's gradient hero (Option A) shows income/expense as plain
    // magnitudes (colour would clash against the blue background) and
    // signs only the headline net figure — Reports keeps its own,
    // unsigned convention for net. Same underlying numbers, each screen's
    // own established formatting.
    await expect(page.getByText('ETB 200.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('ETB 75.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('+ETB 125.00', { exact: true }).first()).toBeVisible()

    await page.goto('/money')
    await expect(page.getByText('ETB 200.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('-ETB 75.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('ETB 125.00', { exact: true }).first()).toBeVisible()
  })

  test('tapping the money card opens Reports', async ({ page }) => {
    await page.getByText('+ETB 125.00', { exact: true }).first().click()
    await expect(page).toHaveURL('/money')
  })

  test('the period toggle persists across a reload (AC-H2)', async ({ page }) => {
    await page.getByRole('radio', { name: 'Week' }).click()
    await expect(page.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')

    await page.reload()
    await expect(page.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe("Home — today's tasks", () => {
  test.beforeEach(async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
  })

  test('shows only the first 5 of the 7 today-relevant tasks, with the overdue count in its own badge', async ({
    page,
  }) => {
    await expect(page.getByText('3 overdue')).toBeVisible()
    await expect(page.getByText('+2 more today')).toBeVisible()

    // Exactly 5 checkboxes rendered for today's tasks (not all 7).
    const checkboxes = page.getByRole('checkbox', { name: /^Mark "(Overdue|Due today)/ })
    await expect(checkboxes).toHaveCount(5)
  })

  test("matches the Tasks screen's own Today view", async ({ page }) => {
    const homeTitles = await page
      .getByRole('checkbox', { name: /^Mark "(Overdue|Due today)/ })
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

    await page.goto('/tasks')
    await expect(page.getByRole('checkbox').first()).toBeVisible()
    const tasksTitles = await page
      .getByRole('checkbox', { name: /^Mark "(Overdue|Due today)/ })
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

    expect(homeTitles).toEqual(tasksTitles.slice(0, 5))
  })

  test('completing a task from Home updates both Home and the Tasks screen immediately (AC-H3)', async ({
    page,
  }) => {
    await page.getByRole('checkbox', { name: 'Mark "Overdue A" done' }).click()
    // Today's view (Home's and Tasks') only ever shows *incomplete*
    // overdue/due-today tasks — completing one removes it from the card
    // outright rather than flipping it to a "done, still shown" state.
    await expect(page.getByRole('checkbox', { name: /Overdue A/ })).toHaveCount(0)
    // The overdue badge drops from 3 to 2 now that one of the 3 overdue
    // tasks is done.
    await expect(page.getByText('2 overdue')).toBeVisible()

    await page.goto('/tasks')
    await page.getByRole('radio', { name: 'Completed' }).click()
    await expect(page.getByText('Overdue A')).toBeVisible()
  })

  test('tapping the tasks card opens Tasks', async ({ page }) => {
    await page.getByRole('button', { name: 'Tasks ›' }).click()
    await expect(page).toHaveURL('/tasks')
  })
})

test.describe('Home — recent notes', () => {
  test.beforeEach(async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
  })

  test('shows the 3 most recently *edited* notes, not the most recently created', async ({
    page,
  }) => {
    await expect(page.getByText('Note updated today', { exact: true })).toBeVisible()
    await expect(page.getByText('Note updated 1 days ago', { exact: true })).toBeVisible()
    await expect(page.getByText('Note updated 2 days ago', { exact: true })).toBeVisible()
    // Edited longest ago among the five, even though it was *created* most
    // recently — must not appear.
    await expect(page.getByText('Note updated 4 days ago', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Note updated 3 days ago', { exact: true })).toHaveCount(0)
  })

  test('tapping a note opens it in the editor', async ({ page }) => {
    await page.getByText('Note updated today').click()
    await expect(page).toHaveURL('/notes/note-0')
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
      'Note updated today',
    )
  })

  test('tapping the notes card header opens Notes', async ({ page }) => {
    await page.getByRole('button', { name: 'Notes ›' }).click()
    await expect(page).toHaveURL('/notes')
  })
})

test.describe('Home — weekly plan/review banner', () => {
  test('shows the plan banner on the configured plan day', async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: TODAY_DOW, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
    await expect(page.getByText('Plan your week', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page).toHaveURL('/tasks/plan')
  })

  test('shows the review banner on the configured review day', async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: TODAY_DOW }),
    )
    await page.goto('/')
    await expect(page.getByText('Review your week', { exact: true })).toBeVisible()
  })

  test('stays hidden on a day that matches neither', async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
    await expect(page.getByText('Plan your week', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Review your week', { exact: true })).toHaveCount(0)
  })

  test('dismissing stays dismissed for the rest of the day, across a reload', async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: TODAY_DOW, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
    await expect(page.getByText('Plan your week', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss for today' }).click()
    await expect(page.getByText('Plan your week', { exact: true })).toHaveCount(0)

    await page.reload()
    await expect(page.getByText('Plan your week', { exact: true })).toHaveCount(0)
  })
})

test.describe('Home — quick actions', () => {
  test.beforeEach(async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: NOT_TODAY, weeklyReviewDay: NOT_TODAY }),
    )
    await page.goto('/')
  })

  test('Add income opens the transaction sheet pre-set to income', async ({ page }) => {
    await page.getByRole('button', { name: 'Income', exact: true }).click()
    await expect(page).toHaveURL('/money/new?type=income')
    await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Income' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('Add expense opens the transaction sheet pre-set to expense', async ({ page }) => {
    await page.getByRole('button', { name: 'Expense', exact: true }).click()
    await expect(page).toHaveURL('/money/new?type=expense')
    await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Expense' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('New note opens the note editor', async ({ page }) => {
    await page.getByRole('button', { name: 'Note', exact: true }).click()
    await expect(page).toHaveURL('/notes/new')
  })

  test('New task opens the add-task sheet', async ({ page }) => {
    await page.getByRole('button', { name: 'Task', exact: true }).click()
    await expect(page).toHaveURL('/tasks/new')
    await expect(page.getByRole('dialog', { name: 'Add task' })).toBeVisible()
  })
})

test.describe('Home — accessibility', () => {
  // Set via localStorage *before* the app boots (same key ThemeProvider
  // itself reads/writes) rather than flipping `data-theme` after the page
  // has already rendered — a post-render flip rides the nav links'
  // `transition-colors`, and axe can sample a color mid-transition, which
  // is a flaky artifact of the test, not a real contrast bug.
  async function gotoWithTheme(page: Page, theme: 'light' | 'dark') {
    await page.addInitScript((t) => localStorage.setItem('dowi:theme', t), theme)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  }

  test.beforeEach(async ({ page }) => {
    await importFixture(
      page,
      buildFixture({ weeklyPlanDay: TODAY_DOW, weeklyReviewDay: NOT_TODAY }),
    )
  })

  test('zero automatically-detectable accessibility violations, light theme', async ({ page }) => {
    await gotoWithTheme(page, 'light')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('zero automatically-detectable accessibility violations, dark theme', async ({ page }) => {
    await gotoWithTheme(page, 'dark')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

// A separate describe block — the tour's entry point only renders on a
// genuinely empty database (`hasNoData`), unlike the fixture-seeded
// beforeEach every other a11y test above uses.
test.describe('Home — accessibility, getting-started tour open', () => {
  test('zero violations with the tour open, light theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dowi:theme', 'light'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Take the tour' }).click()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('zero violations with the tour open, dark theme', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dowi:theme', 'dark'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Take the tour' }).click()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
