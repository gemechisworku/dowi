import { test, expect } from '@playwright/test'

/**
 * Covers the M3 money-capture flow end to end against real IndexedDB.
 * A few of these assertions are direct regression tests for bugs the
 * manual pass caught before merge (see docs/PLAN.md §M3):
 *   - an expense's amount must show a minus sign (MoneyText used to only
 *     look at the raw stored value, which is always non-negative)
 *   - seeded categories must appear in the intended order, "Food" first
 *     (Dexie's default iteration order is by primary key, not creation
 *     order, which otherwise scrambles the deliberately-ordered seed list)
 *   - the add sheet must actually open on the very first tap (a React
 *     StrictMode + async history.back() race could silently close it)
 */

async function addExpense(
  page: import('@playwright/test').Page,
  digits: string[],
  category: string,
) {
  await page.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  for (const key of digits) await page.getByRole('button', { name: key, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(category) }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test.describe('Money — transaction capture', () => {
  test('the add sheet opens on the first tap', async ({ page }) => {
    await page.goto('/money')
    await page.getByRole('button', { name: 'Add transaction' }).click()
    await expect(page.getByRole('dialog', { name: 'Add transaction' })).toBeVisible()
  })

  test('seeded expense categories appear in the intended order, Food first', async ({ page }) => {
    await page.goto('/money')
    await page.getByRole('button', { name: 'Add transaction' }).click()
    const firstChip = page.locator('[role="group"][aria-label="Category"] button').first()
    await expect(firstChip).toContainText('Food')
  })

  test('adding an expense shows it with a minus sign, in the correct category', async ({
    page,
  }) => {
    await page.goto('/money')
    await addExpense(page, ['1', '2', '5'], 'Food')

    await expect(page.getByText('-ETB 125.00').first()).toBeVisible()
    await expect(page.getByText('Food', { exact: true }).first()).toBeVisible()
  })

  test('editing a transaction pre-fills the form and persists changes', async ({ page }) => {
    await page.goto('/money')
    await addExpense(page, ['5', '0'], 'Food')

    await page.getByText('Food', { exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Edit transaction' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('-ETB 50.00')).toBeVisible()

    await page.getByLabel('Note').fill('Lunch with the team')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Lunch with the team')).toBeVisible()
  })

  test('deleting a transaction offers undo, which restores it', async ({ page }) => {
    await page.goto('/money')
    await addExpense(page, ['3', '0'], 'Food')

    await page.getByText('Food', { exact: true }).first().click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click()

    await expect(page.getByText('No transactions yet')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('No transactions yet')).not.toBeVisible()
    await expect(page.getByText('-ETB 30.00').first()).toBeVisible()
  })

  test('filtering by type narrows the list and shows a removable chip', async ({ page }) => {
    await page.goto('/money')
    await addExpense(page, ['1', '0'], 'Food')

    await page.getByRole('button', { name: 'Filters' }).click()
    await page.getByRole('radio', { name: 'Income' }).click()
    await page.getByRole('button', { name: 'Apply' }).click()

    await expect(page.getByText('No transactions match these filters')).toBeVisible()
    await expect(page.getByRole('button', { name: /Income ✕/ })).toBeVisible()

    await page.getByRole('button', { name: /Income ✕/ }).click()
    await expect(page.getByText('-ETB 10.00').first()).toBeVisible()
  })
})

test.describe('Money — category reassign on delete', () => {
  test('deleting a category in use requires choosing a replacement first', async ({ page }) => {
    await page.goto('/money')
    await addExpense(page, ['5', '0'], 'Food')

    await page.getByRole('link', { name: 'Categories' }).click()
    await page.getByRole('button', { name: 'Delete Food' }).click()

    await expect(page.getByText(/is used by 1 transaction/)).toBeVisible()
    const confirmButton = page.getByRole('button', { name: /Reassign & delete/ })
    await expect(confirmButton).toBeDisabled()

    await page.getByLabel('Reassign to').selectOption({ label: 'Transport' })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    const list = page.getByRole('main')
    await expect(list.getByText('Food', { exact: true })).not.toBeVisible()

    await page.goto('/money')
    await expect(page.getByText('Transport', { exact: true }).first()).toBeVisible()
  })

  test('deleting an unused category asks for a plain confirmation, not a reassign picker', async ({
    page,
  }) => {
    await page.goto('/money/categories')
    await page.getByRole('button', { name: 'Delete Food' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Delete "Food"?' })).toBeVisible()
  })
})
