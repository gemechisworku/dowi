import { test, expect } from '@playwright/test'

test('app shell loads and shows the four primary tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Money' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Notes' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tasks' })).toBeVisible()
})

test('the header theme toggle cycles system -> light -> dark and persists', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')

  await page.getByRole('button', { name: /Switch to light theme/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('button', { name: /Switch to dark theme/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: /Switch to system theme/ }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')
})

test('zero third-party network requests after initial load', async ({ page }) => {
  const thirdPartyRequests: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      thirdPartyRequests.push(req.url())
    }
  })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(thirdPartyRequests).toEqual([])
})
