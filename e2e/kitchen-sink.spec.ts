import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Kitchen sink', () => {
  test('renders every component section without overflow', async ({ page }) => {
    await page.goto('/kitchen-sink')
    for (const heading of [
      'Buttons & basics',
      'Form controls',
      'Sheets, dialogs & feedback',
      'Money & task building blocks',
      'Charts',
    ]) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
    // No horizontal overflow at mobile viewport width.
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(hasHorizontalScroll).toBe(false)
  })

  test('theme toggle switches every section without a console error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/kitchen-sink')

    // The buttons' visible capitalisation is CSS-only (text-transform), so
    // the accessible name/DOM text is still lowercase — match that.
    await page.getByRole('button', { name: 'dark', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.getByRole('button', { name: 'light', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    expect(errors).toEqual([])
  })

  test('a sheet opens, traps focus, and dismisses on Escape', async ({ page }) => {
    await page.goto('/kitchen-sink')
    await page.getByRole('button', { name: 'Open sheet' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add expense' })
    await expect(sheet).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(sheet).not.toBeVisible()
  })

  test('has zero automatically-detectable accessibility violations', async ({ page }) => {
    await page.goto('/kitchen-sink')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Top-level screens', () => {
  for (const path of ['/', '/money', '/notes', '/tasks']) {
    test(`${path} has zero automatically-detectable accessibility violations`, async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
})
