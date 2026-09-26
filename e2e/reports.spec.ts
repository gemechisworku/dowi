import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Covers the M4 reports screen end to end against real IndexedDB, on top of
 * transactions entered through the M3 add-transaction sheet (not a fixture
 * seed — there is no `seed:demo` yet, that's an M10 deliverable).
 */

async function addTransaction(
  page: Page,
  type: 'income' | 'expense',
  digits: string[],
  category: string,
) {
  await page.goto('/money/transactions')
  await page.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  if (type === 'income') {
    await page.getByRole('radio', { name: 'Income' }).click()
  }
  for (const key of digits) await page.getByRole('button', { name: key, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(category) }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test.describe('Reports — headline and breakdowns', () => {
  test.beforeEach(async ({ page }) => {
    await addTransaction(page, 'expense', ['1', '0', '0'], 'Food')
    await addTransaction(page, 'expense', ['5', '0'], 'Transport')
    await addTransaction(page, 'income', ['2', '0', '0'], 'Salary')
    await page.goto('/money')
  })

  test('income, expense and net match the transactions just entered', async ({ page }) => {
    await expect(page.getByText('ETB 200.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('-ETB 150.00', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('ETB 50.00', { exact: true }).first()).toBeVisible()
  })

  test('the expense breakdown is ranked by amount and sums to the expense total', async ({
    page,
  }) => {
    const list = page.getByRole('main')
    await expect(list.getByText('Food', { exact: true }).first()).toBeVisible()
    await expect(list.getByText('Transport', { exact: true }).first()).toBeVisible()
    await expect(list.getByText('67% · 1 transaction')).toBeVisible()
    await expect(list.getByText('33% · 1 transaction')).toBeVisible()
  })

  test('switching to income shows the income breakdown instead', async ({ page }) => {
    await page.getByRole('button', { name: /^income$/i }).click()
    await expect(page.getByText('Salary', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Food', { exact: true })).toHaveCount(0)
  })

  test('exporting CSV downloads one row per transaction plus the header', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^dowi-month-\d{4}-\d{2}-\d{2}\.csv$/)
    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const content = Buffer.concat(chunks).toString('utf-8')
    const rows = content.trim().split('\r\n')
    expect(rows).toHaveLength(4) // header + 3 transactions
    expect(rows[0]).toBe('Date,Type,Amount,Currency,Category,Source,Account,Note,Tags')
  })

  test('"View transactions" opens the money list filtered to the report range', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'View transactions' }).click()
    await expect(page).toHaveURL(
      /\/money\/transactions\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/,
    )
  })

  test('sharing uses the Web Share API with a plain-text summary when available', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // @ts-expect-error test stub
      window.__shareCalls = []
      // @ts-expect-error test stub
      navigator.share = (data: { text?: string }) => {
        // @ts-expect-error test stub
        window.__shareCalls.push(data)
        return Promise.resolve()
      }
    })
    await page.goto('/money')
    await page.getByRole('button', { name: 'Share', exact: true }).click()
    const calls = await page.evaluate(
      () => (window as unknown as { __shareCalls: { text: string }[] }).__shareCalls,
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]?.text).toContain('Income: ETB 200.00')
    expect(calls[0]?.text).toContain('Expense: ETB 150.00')
    expect(calls[0]?.text).toContain('Net: ETB 50.00')
    expect(calls[0]?.text).toContain('Top expenses:')
  })

  test('sharing falls back to the clipboard, with a confirmation snackbar, when Web Share is unavailable', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // @ts-expect-error test stub — force the clipboard fallback path
      delete (navigator as unknown as { share?: unknown }).share
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            // @ts-expect-error test stub
            window.__copiedText = text
            return Promise.resolve()
          },
        },
      })
    })
    await page.goto('/money')
    await page.getByRole('button', { name: 'Share', exact: true }).click()
    await expect(page.getByText('Summary copied to clipboard')).toBeVisible()
    const copied = await page.evaluate(
      () => (window as unknown as { __copiedText: string }).__copiedText,
    )
    expect(copied).toContain('Net: ETB 50.00')
  })
})

test.describe('Reports — recurring transactions', () => {
  test("a recurring occurrence counts toward this month's headline expense total and its own Recurring section", async ({
    page,
  }) => {
    const now = new Date().toISOString()
    const today = now.slice(0, 10)
    const fixture = {
      formatVersion: 1,
      exportedAt: now,
      categories: [
        {
          id: 'cat-subs',
          createdAt: now,
          updatedAt: now,
          name: 'Subscriptions',
          icon: '💳',
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
      meta: [],
      recurringTransactions: [
        {
          id: 'rec-netflix',
          createdAt: now,
          updatedAt: now,
          name: 'Netflix',
          type: 'expense',
          amountMinorUnits: 1500,
          currency: 'ETB',
          categoryId: 'cat-subs',
          tags: [],
          interval: { unit: 'month', every: 1 },
          startDate: today,
          autoRecord: true,
          occurrenceIndex: 1,
          nextDueDate: today,
          paused: false,
        },
      ],
      transactions: [
        {
          id: 'tx-ordinary',
          createdAt: now,
          updatedAt: now,
          type: 'expense',
          amountMinorUnits: 10000,
          currency: 'ETB',
          date: today,
          categoryId: 'cat-subs',
          tags: [],
        },
        {
          id: 'tx-netflix-occurrence',
          createdAt: now,
          updatedAt: now,
          type: 'expense',
          amountMinorUnits: 1500,
          currency: 'ETB',
          date: today,
          categoryId: 'cat-subs',
          tags: [],
          recurringId: 'rec-netflix',
        },
      ],
    }
    const fixturePath = join(tmpdir(), `dowi-recurring-reports-fixture-${test.info().testId}.json`)
    writeFileSync(fixturePath, JSON.stringify(fixture))
    await page.goto('/debug/data')
    await page.getByLabel('Import JSON').setInputFiles(fixturePath)
    await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/money')
    // Headline expense = 100 (ordinary) + 15 (Netflix occurrence) = 115, not 100.
    await expect(page.getByText('ETB 115.00', { exact: true }).first()).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Recurring' })).toBeVisible()
    await expect(
      page.getByText('Already counted in the totals above', { exact: false }),
    ).toBeVisible()
    await expect(page.getByText('Netflix', { exact: true })).toBeVisible()
  })
})

test.describe('Reports — empty period', () => {
  test('a day with no transactions shows the empty states, not a zero-height chart', async ({
    page,
  }) => {
    // "Day → categories" is the one sub-period shape that can genuinely be
    // empty (week/month/year always render structural buckets — 7 days, N
    // weeks, 12 months — even with zero transactions in them).
    await addTransaction(page, 'expense', ['1', '0'], 'Food')
    await page.goto('/money')
    await page.getByRole('radio', { name: 'Day' }).click()
    await page.getByRole('button', { name: 'Previous period' }).click() // yesterday: no data
    await expect(page.getByText('No data for this period')).toBeVisible()
    await expect(page.getByText('No expense in this period')).toBeVisible()
  })
})
