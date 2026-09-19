import { test, expect } from '@playwright/test'

/**
 * Exercises the real browser IndexedDB (not fake-indexeddb, which the unit
 * suite uses) end to end — this is the automated form of TESTING.md §M2
 * manual steps 1 and 3 (persistence across reload; erase all).
 */
test.describe('Data persistence (real IndexedDB)', () => {
  test('a created record survives a full page reload', async ({ page }) => {
    await page.goto('/debug/data')
    await expect(page.getByRole('heading', { name: /Categories \(\d+\)/ })).toBeVisible()

    const before = await page.getByRole('heading', { name: /Categories \(\d+\)/ }).textContent()
    const beforeCount = Number(before?.match(/\((\d+)\)/)?.[1])

    await page.getByRole('button', { name: 'Add a test category' }).click()
    await expect(
      page.getByRole('heading', { name: `Categories (${beforeCount + 1})` }),
    ).toBeVisible()

    await page.reload()

    await expect(
      page.getByRole('heading', { name: `Categories (${beforeCount + 1})` }),
    ).toBeVisible()
  })

  test('erase all empties every table', async ({ page }) => {
    await page.goto('/debug/data')
    await page.getByRole('button', { name: 'Add a test category' }).click()

    await page.getByRole('button', { name: 'Erase all' }).click()
    await page.getByRole('button', { name: 'Erase everything' }).click()

    await expect(page.getByRole('heading', { name: 'Categories (0)' })).toBeVisible()
  })

  test('storage usage can be checked without error', async ({ page }) => {
    await page.goto('/debug/data')
    await page.getByRole('button', { name: 'Check' }).click()
    await expect(page.getByText(/Used:/)).toBeVisible()
    await expect(page.getByText(/Persisted:/)).toBeVisible()
  })
})
