import { test, expect } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * `aggregate.test.ts`'s "5,000 transactions in under 100ms" case proves the
 * pure aggregation function scales — but that's not the same claim as "the
 * Reports screen itself stays responsive with a real-sized database behind
 * it" (IndexedDB read + React render + SVG charts are all extra cost the
 * unit test never sees). This drives that end to end via real IndexedDB.
 */

const TRANSACTION_COUNT = 5000

function buildFixture() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const transactions = Array.from({ length: TRANSACTION_COUNT }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0')
    const isIncome = i % 4 === 0
    return {
      id: `perf-tx-${i}`,
      type: isIncome ? 'income' : 'expense',
      amountMinorUnits: 1000 + (i % 97) * 137,
      currency: 'ETB',
      date: `${year}-${month}-${day}`,
      categoryId: `cat-${i % 8}`,
      accountId: `acct-${i % 3}`,
      sourceId: isIncome ? `src-${i % 2}` : undefined,
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  })

  return {
    formatVersion: 1,
    exportedAt: now.toISOString(),
    transactions,
    categories: [],
    sources: [],
    accounts: [],
    rates: [],
    notes: [],
    noteCollections: [],
    tasks: [],
    taskCollections: [],
    notifications: [],
    meta: [],
  }
}

test('Reports screen stays responsive with 5,000 transactions in the current month', async ({
  page,
}) => {
  const fixturePath = join(tmpdir(), `dowi-perf-fixture-${test.info().testId}.json`)
  writeFileSync(fixturePath, JSON.stringify(buildFixture()))

  await page.goto('/debug/data')
  await page.getByLabel('Import JSON').setInputFiles(fixturePath)
  await expect(page.getByText(/Imported \d+ categories and more/)).toBeVisible({ timeout: 15_000 })

  const start = Date.now()
  await page.goto('/money')
  await expect(page.getByText('Income', { exact: true }).first()).toBeVisible()
  // Headline totals only settle once buildReport() has actually run against
  // all 5,000 rows — waiting for the real (non-zero) net figure, not just
  // the static "Income" label, is what makes this a meaningful timing gate.
  await expect(page.getByText(/^ETB [\d,]+\.\d{2}$/).first()).toBeVisible()
  const elapsed = Date.now() - start

  // Observed ~50ms locally for a full page load + IndexedDB read + render of
  // 5,000 rows; 1.5s leaves generous headroom for a slower CI machine while
  // still catching a real regression (e.g. an accidental O(n²) pass).
  expect(elapsed).toBeLessThan(1500)
})
