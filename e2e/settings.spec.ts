import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import AxeBuilder from '@axe-core/playwright'

/**
 * Covers M9 Settings end to end against real IndexedDB (both themes, via
 * playwright.config's two projects). AC-S1 (persists + takes effect
 * immediately) is spot-checked across a representative few settings, not
 * every single one — the same scope call M8's home.spec.ts made for its
 * own "every number matches" acceptance criterion.
 */

const REMINDERS_DEFAULT = {
  weeklyPlan: { enabled: true, day: 1, time: '08:00' },
  weeklyReview: { enabled: true, day: 6, time: '18:00' },
  taskDue: { enabled: true, offsets: [0, 1440] },
  dailyAgenda: { enabled: false, time: '07:30' },
  backupNudge: { enabled: true, intervalDays: 30 },
  quietHours: { enabled: true, start: '22:00', end: '07:00' },
}

function settingsFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settings',
    baseCurrency: 'ETB',
    weekStartsOn: 1,
    fyStartMonth: 1,
    theme: 'system',
    textSize: 'm',
    density: 'comfortable',
    hideAmounts: false,
    reminders: REMINDERS_DEFAULT,
    ...overrides,
  }
}

function fullFixture(overrides: {
  transactions?: unknown[]
  categories?: unknown[]
  settings?: Record<string, unknown>
}) {
  const now = new Date().toISOString()
  return {
    formatVersion: 1,
    exportedAt: now,
    transactions: overrides.transactions ?? [],
    categories: overrides.categories ?? [],
    sources: [],
    accounts: [],
    rates: [],
    notes: [],
    noteCollections: [],
    tasks: [],
    taskCollections: [],
    notifications: [],
    settings: settingsFixture(overrides.settings ?? {}),
    meta: [{ key: 'seededAt', value: now }],
  }
}

async function importFixture(page: Page, fixture: unknown) {
  const fixturePath = join(tmpdir(), `dowi-settings-fixture-${test.info().testId}.json`)
  writeFileSync(fixturePath, JSON.stringify(fixture))
  await page.goto('/debug/data')
  await page.getByLabel('Import JSON').setInputFiles(fixturePath)
  await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({ timeout: 15_000 })
}

async function addExpense(page: Page, digits: string[], category: string) {
  await page.goto('/money/transactions')
  await page.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  for (const key of digits) await page.getByRole('button', { name: key, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(category) }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test.describe('Settings — Appearance', () => {
  test('theme takes effect immediately and persists across a reload', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  })

  test('text size takes effect immediately and persists across a reload', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('radio', { name: 'L', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'l')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'l')
  })

  test('density takes effect immediately and persists across a reload', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('radio', { name: 'Compact' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  })

  test('an enabled Switch is visibly a different colour than a disabled one', async ({ page }) => {
    // Regression test for a real bug: the Switch track had both an inline
    // `style` background *and* a `peer-checked:bg-[...]` class targeting
    // the same property — inline styles always win over classes regardless
    // of specificity, so the "on" colour could never actually render, no
    // matter what the class said. Only a real browser's computed style
    // catches this class of bug; a jsdom/class-name check would not have.
    await page.goto('/settings')
    const on = page.getByRole('switch', { name: 'Task due reminders' })
    const off = page.getByRole('switch', { name: 'Daily agenda' })
    await expect(on).toBeChecked()
    await expect(off).not.toBeChecked()

    const trackColor = (locator: typeof on) =>
      locator
        .locator('xpath=following-sibling::span[1]')
        .evaluate((el) => getComputedStyle(el).backgroundColor)

    const [onColor, offColor] = await Promise.all([trackColor(on), trackColor(off)])
    expect(onColor).not.toBe(offColor)
  })
})

test.describe('Settings — Money', () => {
  test('base currency persists across a reload', async ({ page }) => {
    await page.goto('/settings')
    const currencyInput = page.getByLabel('Base currency')
    await currencyInput.fill('USD')
    await currencyInput.blur()
    await expect(currencyInput).toHaveValue('USD')

    // Round-trip via in-app (client-side) navigation first: `commitCurrency`
    // writes to IndexedDB asynchronously and isn't awaited by the blur
    // itself, so a `page.reload()` immediately after can race a write that
    // hasn't landed yet. A same-session route change keeps the app (and
    // its one open IndexedDB connection) alive the whole time, so by the
    // time Settings remounts here the write is guaranteed to be done —
    // confirming that *before* the real reload below actually exercises
    // the reload rather than a coin flip.
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByLabel('Base currency')).toHaveValue('USD')

    await page.reload()
    await expect(page.getByLabel('Base currency')).toHaveValue('USD')
  })

  test('default account pre-fills a new transaction', async ({ page }) => {
    await page.goto('/money/accounts')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByLabel('Name').fill('Wallet')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Wallet')).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Default account').selectOption({ label: 'Wallet' })
    // Same race as above — confirm the write landed via an in-app round
    // trip before relying on it from a different route.
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByLabel('Default account')).toHaveValue(/.+/)

    await page.getByRole('link', { name: 'Money' }).click()
    await page.getByRole('link', { name: 'Transactions', exact: true }).click()
    await page.getByRole('button', { name: 'Add transaction' }).click()
    await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
    // Poll rather than a one-shot read — the account list and the sheet's
    // own default-account sync both load asynchronously, a tick or two
    // after the dialog itself becomes visible.
    await expect
      .poll(() =>
        page.getByLabel('Account').evaluate((el) => {
          const select = el as HTMLSelectElement
          return select.options[select.selectedIndex]?.textContent
        }),
      )
      .toBe('Wallet')
  })

  test('FY start month changes which transactions the Year report totals', async ({ page }) => {
    await importFixture(
      page,
      fullFixture({
        categories: [
          {
            id: 'cat-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            name: 'Food',
            icon: '🍔',
            color: '#000',
            type: 'expense',
          },
        ],
        transactions: [
          {
            id: 'tx-feb',
            createdAt: '2026-02-01T00:00:00.000Z',
            updatedAt: '2026-02-01T00:00:00.000Z',
            type: 'expense',
            amountMinorUnits: 10000,
            currency: 'ETB',
            date: '2026-02-10',
            categoryId: 'cat-1',
            tags: [],
          },
          {
            id: 'tx-aug',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
            type: 'expense',
            amountMinorUnits: 30000,
            currency: 'ETB',
            date: '2026-08-10',
            categoryId: 'cat-1',
            tags: [],
          },
        ],
        settings: { fyStartMonth: 1 },
      }),
    )

    await page.goto('/money')
    await page.getByRole('radio', { name: 'Year' }).click()
    // fyStartMonth=1 → calendar-year FY, both Feb and Aug fall inside it.
    await expect(page.getByText('-ETB 400.00', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Financial-year start month').selectOption({ label: 'July' })

    // In-app navigation, not page.goto — see the base-currency test above
    // for why (avoids racing the fire-and-forget settings write).
    await page.getByRole('link', { name: 'Money' }).click()
    await page.getByRole('radio', { name: 'Year' }).click()
    // fyStartMonth=7 → the current FY is Jul 2026–Jun 2027, so only the
    // August transaction is in range — the total actually changes.
    await expect(page.getByText('-ETB 300.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('-ETB 400.00', { exact: true })).toHaveCount(0)
  })

  test('hide amounts blurs amounts on Home and on the Money transaction list', async ({ page }) => {
    await addExpense(page, ['1', '0', '0'], 'Food')

    const listAmount = page.getByText('-ETB 100.00', { exact: true }).first()
    await expect(listAmount).toBeVisible()
    await expect(listAmount).toHaveCSS('filter', 'none')

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('switch', { name: 'Hide amounts' }).click()

    // In-app navigation — see the base-currency test above for why.
    await page.getByRole('link', { name: 'Money' }).click()
    await page.getByRole('link', { name: 'Transactions', exact: true }).click()
    await expect(page.getByText('-ETB 100.00', { exact: true }).first()).toHaveCSS('filter', /blur/)

    await page.getByRole('link', { name: 'Home' }).click()
    const heroAmount = page.locator('[aria-hidden="true"]', { hasText: /ETB/ }).first()
    await expect(heroAmount).toHaveCSS('filter', /blur/)
  })
})

test.describe('Settings — Data', () => {
  test('export -> erase -> import restores the data (AC-S2)', async ({ page }) => {
    await page.goto('/money/categories')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByLabel('Name').fill('Groceries')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Groceries')).toBeVisible()

    await page.goto('/settings')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export backup' }).click(),
    ])
    const backupPath = join(tmpdir(), `dowi-settings-export-${test.info().testId}.json`)
    await download.saveAs(backupPath)

    await page.getByRole('button', { name: 'Erase all data' }).click()
    await page.getByLabel('Type ERASE to confirm').fill('ERASE')
    await page.getByRole('button', { name: 'Erase everything' }).click()
    // Wait for the app's own confirmation before navigating away — erase is
    // async, and `page.goto` is a real navigation that could otherwise race it.
    await expect(page.getByText('All data erased')).toBeVisible()

    await page.goto('/money/categories')
    await expect(page.getByText('Groceries')).toHaveCount(0)

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Import backup' }).click()
    // The hidden <input type=file> triggered by "Import backup" — set directly.
    await page.locator('input[type="file"]').setInputFiles(backupPath)
    await expect(page.getByRole('alertdialog', { name: 'Review this import' })).toBeVisible()
    await expect(page.getByText('Categories')).toBeVisible()
    await page.getByRole('button', { name: 'Merge in' }).click()
    await expect(page.getByText(/Imported \d+ records? \(merged\)/)).toBeVisible()

    await page.goto('/money/categories')
    await expect(page.getByText('Groceries')).toBeVisible()
  })

  test('importing a corrupted file fails safely with no data loss (AC-S3)', async ({ page }) => {
    await page.goto('/money/categories')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByLabel('Name').fill('Keep me')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Keep me')).toBeVisible()

    const badPath = join(tmpdir(), `dowi-settings-corrupt-${test.info().testId}.json`)
    writeFileSync(badPath, '{ this is not valid json')

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Import backup' }).click()
    await page.locator('input[type="file"]').setInputFiles(badPath)
    await expect(page.getByText(/not a valid Dowi backup/i)).toBeVisible()
    await expect(page.getByRole('alertdialog', { name: 'Review this import' })).toHaveCount(0)

    await page.goto('/money/categories')
    await expect(page.getByText('Keep me')).toBeVisible()
  })

  test('erase-all requires the exact typed phrase; a wrong phrase or cancel changes nothing', async ({
    page,
  }) => {
    await page.goto('/money/categories')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByLabel('Name').fill('Untouched')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Untouched')).toBeVisible()

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Erase all data' }).click()
    const confirmButton = page.getByRole('button', { name: 'Erase everything' })
    await expect(confirmButton).toBeDisabled()

    await page.getByLabel('Type ERASE to confirm').fill('nope')
    await expect(confirmButton).toBeDisabled()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)

    await page.goto('/money/categories')
    await expect(page.getByText('Untouched')).toBeVisible()
  })

  test('storage usage and persistent-storage request both report something', async ({ page }) => {
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Check', exact: true }).click()
    await expect(page.getByText(/Used:/)).toBeVisible()
    await expect(page.getByText(/Persisted:/)).toBeVisible()

    await page.getByRole('button', { name: 'Request persistent storage' }).click()
    await expect(page.getByText(/persistent storage/i).last()).toBeVisible()
  })
})

test.describe('Settings — About', () => {
  test('shows a version and reports a check-for-update result', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText(/^\d+\.\d+\.\d+$/)).toBeVisible()

    await page.getByRole('button', { name: 'Check for update' }).click()
    // Whichever of the three outcomes actually happens in this browser/context
    // (no update / an update found / no service worker support) — this is a
    // manual one-shot check, not the passive update-detection flow (that's
    // M10's), so all three are a legitimate result here.
    await expect(page.getByText(/latest version|update was found|service worker/i)).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe('Settings — accessibility', () => {
  test('has zero automatically-detectable accessibility violations', async ({ page }) => {
    await page.goto('/settings')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
