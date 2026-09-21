import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

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
