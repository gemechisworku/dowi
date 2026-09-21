import { test, expect } from '@playwright/test'

/**
 * Covers the M6 Plan-the-week / Review-the-week loop end to end. Both
 * screens key off "this week" (today's ISO week), so a task added via
 * Plan's quick-add lands in exactly the same set Review reads back.
 */

test.describe('Plan the week', () => {
  test('quick-add puts a task straight into this week', async ({ page }) => {
    await page.goto('/tasks/plan')
    await page.getByLabel('Add a task to this week').fill('Deep clean the kitchen')
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    await expect(page.getByText('Deep clean the kitchen')).toBeVisible()
    await expect(page.getByText('Nothing planned yet')).not.toBeVisible()
  })

  test('completing a this-week task via the checkbox works from the plan screen', async ({
    page,
  }) => {
    await page.goto('/tasks/plan')
    await page.getByLabel('Add a task to this week').fill('Deep clean the kitchen')
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    await page.getByRole('checkbox', { name: 'Mark "Deep clean the kitchen" done' }).click()
    await expect(
      page.getByRole('checkbox', { name: 'Mark "Deep clean the kitchen" not done' }),
    ).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('Review the week', () => {
  test('shows nothing to review when the week has no tasks', async ({ page }) => {
    await page.goto('/tasks/review')
    await expect(page.getByText('Nothing planned this week')).toBeVisible()
  })

  test('splits done/not-done and reports the right completion rate', async ({ page }) => {
    await page.goto('/tasks/plan')
    await page.getByLabel('Add a task to this week').fill('Task A')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Task A')).toBeVisible()
    await page.getByLabel('Add a task to this week').fill('Task B')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Task B')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Mark "Task A" done' }).click()
    await expect(page.getByRole('checkbox', { name: 'Mark "Task A" not done' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await page.goto('/tasks/review')
    await expect(page.getByText('1 of 2 done')).toBeVisible()
    await expect(page.getByText('50%')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Done (1)', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Not done (1)', exact: true })).toBeVisible()
  })

  test("carrying forward moves not-done tasks to next week, off this week's review", async ({
    page,
  }) => {
    await page.goto('/tasks/plan')
    await page.getByLabel('Add a task to this week').fill('Leftover task')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Leftover task')).toBeVisible()

    await page.goto('/tasks/review')
    await expect(page.getByText('Leftover task')).toBeVisible()
    await page.getByRole('button', { name: 'Carry forward to next week' }).click()
    await expect(page.getByText('Moved 1 task to next week')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Nothing planned this week')).toBeVisible()
  })

  test('saving a reflection creates a note in the Weekly reviews collection', async ({ page }) => {
    await page.goto('/tasks/plan')
    await page.getByLabel('Add a task to this week').fill('Task A')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Task A')).toBeVisible()

    await page.goto('/tasks/review')
    await page.getByPlaceholder('How did the week go?').fill('A solid, productive week.')
    await page.getByRole('button', { name: 'Save reflection' }).click()
    await expect(page.getByText('Reflection saved')).toBeVisible()

    // Re-opening the screen loads the same reflection back — proves it's
    // persisted as a real note, not just local component state.
    await page.reload()
    await expect(page.getByPlaceholder('How did the week go?')).toHaveValue(
      'A solid, productive week.',
    )
  })
})
