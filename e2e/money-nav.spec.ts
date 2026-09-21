import { test, expect } from '@playwright/test'

/**
 * Covers navigation between the Money section's screens: Reports is now
 * `/money`'s index (the Money bottom-nav tab's landing page, previously the
 * transaction list), and every screen under Money shares `MoneySubNav` so a
 * user on any one of them can jump straight to any other without bouncing
 * back through Reports first.
 */

const SECTIONS = [
  { path: '/money', tab: 'Reports', heading: 'Reports' },
  { path: '/money/transactions', tab: 'Transactions', heading: 'Transactions' },
  { path: '/money/categories', tab: 'Categories', heading: 'Categories' },
  { path: '/money/sources', tab: 'Sources', heading: 'Sources' },
  { path: '/money/accounts', tab: 'Accounts', heading: 'Accounts' },
  { path: '/money/rates', tab: 'Rates', heading: 'Exchange rates' },
]

test('tapping the Money bottom-nav tab lands on Reports, not the transaction list', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Money' }).click()
  await expect(page).toHaveURL(/\/money$/)
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
})

for (const section of SECTIONS) {
  test(`${section.path} shows the sub-nav with "${section.tab}" marked current`, async ({
    page,
  }) => {
    await page.goto(section.path)
    await expect(page.getByRole('heading', { name: section.heading, exact: true })).toBeVisible()

    const nav = page.getByRole('navigation', { name: 'Money sections' })
    const activeTab = nav.getByRole('link', { name: section.tab, exact: true })
    await expect(activeTab).toHaveAttribute('aria-current', 'page')

    // Regression check: Accounts/Rates sit past the edge of a 6-tab row at
    // phone width, so the active tab must scroll itself into view rather
    // than land off-screen with nothing in the nav showing which section
    // is current.
    await expect(activeTab).toBeInViewport()

    // Every other tab is present and unmarked.
    for (const other of SECTIONS) {
      if (other.tab === section.tab) continue
      await expect(nav.getByRole('link', { name: other.tab, exact: true })).not.toHaveAttribute(
        'aria-current',
        'page',
      )
    }
  })
}

test('the sub-nav carries a user from Rates directly to Categories, no detour through Reports', async ({
  page,
}) => {
  await page.goto('/money/rates')
  const nav = page.getByRole('navigation', { name: 'Money sections' })
  await nav.getByRole('link', { name: 'Categories', exact: true }).click()
  await expect(page).toHaveURL(/\/money\/categories$/)
  await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible()
})

test('the Money bottom-nav tab stays highlighted across every Money section', async ({ page }) => {
  for (const section of SECTIONS) {
    await page.goto(section.path)
    await expect(page.getByRole('link', { name: /Money/ })).toHaveAttribute('aria-current', 'page')
  }
})
