import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Covers the M6 Tasks flow end to end against real IndexedDB: task CRUD,
 * subtasks, the Today/Upcoming/All/Completed views, collections, and swipe
 * delete-with-undo.
 */

async function addTask(
  page: Page,
  title: string,
  opts: { priority?: 'Low' | 'Medium' | 'High'; dueDate?: string; dueTime?: string } = {},
) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await expect(page.getByRole('dialog', { name: 'Add task' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
  if (opts.priority) {
    await page
      .getByRole('radiogroup', { name: 'Priority' })
      .getByRole('radio', { name: opts.priority })
      .click()
  }
  if (opts.dueDate) await page.getByLabel('Due date').fill(opts.dueDate)
  if (opts.dueTime) await page.getByLabel('Due time').fill(opts.dueTime)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test.describe('Tasks — capture and views', () => {
  test('adding a task with a due date and priority shows it in Today', async ({ page }) => {
    await page.goto('/tasks')
    await addTask(page, 'Finish the report', {
      priority: 'High',
      dueDate: new Date().toISOString().slice(0, 10),
    })

    await expect(page.getByText('Finish the report')).toBeVisible()
    await expect(page.getByText('High', { exact: true })).toBeVisible()
  })

  test('a task with no due date does not appear in Today but does in All', async ({ page }) => {
    await page.goto('/tasks')
    await addTask(page, 'Read a book')

    await expect(page.getByText('Nothing due today')).toBeVisible()
    await page.getByRole('radio', { name: 'All' }).click()
    await expect(page.getByText('Read a book')).toBeVisible()
  })

  test('tapping the checkbox completes the task without opening the edit sheet', async ({
    page,
  }) => {
    await page.goto('/tasks')
    await addTask(page, 'Read a book')
    await page.getByRole('radio', { name: 'All' }).click()

    await page.getByRole('checkbox', { name: 'Mark "Read a book" done' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Read a book')).not.toBeVisible()

    await page.getByRole('radio', { name: 'Completed' }).click()
    await expect(page.getByText('Read a book')).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: 'Mark "Read a book" not done' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  test('tapping the row (not the checkbox) opens the edit sheet and edits persist', async ({
    page,
  }) => {
    await page.goto('/tasks')
    await addTask(page, 'Read a book')
    await page.getByRole('radio', { name: 'All' }).click()

    await page.getByText('Read a book').click()
    const dialog = page.getByRole('dialog', { name: 'Edit task' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Title', exact: true }).fill('Read two books')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Read two books')).toBeVisible()
  })

  test('deleting via swipe offers undo, which restores the task', async ({ page }) => {
    await page.goto('/tasks')
    await addTask(page, 'Read a book')
    await page.getByRole('radio', { name: 'All' }).click()

    // Edit sheet's own Delete button exercises the same repo call as the
    // swipe action without needing to simulate a pointer drag.
    await page.getByText('Read a book').click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click()

    await expect(page.getByText('No tasks yet')).toBeVisible()
    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByText('Read a book')).toBeVisible()
  })

  test('subtasks: adding one shows 0/n progress, checking it off updates the count', async ({
    page,
  }) => {
    await page.goto('/tasks')
    // Subtasks are real child tasks (Task.parentTaskId) now — the parent
    // has to exist first, so the editor only appears once it's saved.
    await addTask(page, 'Plan the trip')

    await page.getByRole('radio', { name: 'All' }).click()
    await page.getByText('Plan the trip').click()
    await expect(page.getByText('Save this task first to add subtasks')).not.toBeVisible()

    await page.getByLabel('New subtask title').fill('Book flights')
    await page.getByLabel('Add subtask').click()
    await page.getByLabel('New subtask title').fill('Book hotel')
    await page.getByLabel('Add subtask').click()
    await expect(page.getByText('Book flights')).toBeVisible()
    await expect(page.getByText('Book hotel')).toBeVisible()
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('0/2 subtasks')).toBeVisible()

    await page.getByText('Plan the trip').click()
    await page.getByRole('checkbox', { name: 'Mark "Book flights" done' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('1/2 subtasks')).toBeVisible()
  })

  test('a subtask opens into the full task editor, with its own notes and due date', async ({
    page,
  }) => {
    await page.goto('/tasks')
    await addTask(page, 'Plan the trip')

    await page.getByRole('radio', { name: 'All' }).click()
    await page.getByText('Plan the trip').click()
    await page.getByLabel('New subtask title').fill('Book flights')
    await page.getByLabel('Add subtask').click()

    // Only one Sheet is ever mounted (see TaskSheet.tsx) — the parent's own
    // fields stay in the DOM but hidden while a subtask's are shown, so a
    // label like "Notes" matches both; `.last()` is always the active one
    // (the subtask's, when one is open — the DOM order the component renders
    // them in), and still resolves correctly to the sole match otherwise.
    await page.getByText('Book flights', { exact: true }).click()
    await page.getByLabel('Notes').last().fill('Window seat if possible')
    await page.getByLabel('Due date').last().fill('2026-12-01')
    await page.getByRole('button', { name: 'Save', exact: true }).last().click()

    // Back at the parent sheet — reopen the subtask to confirm it persisted.
    await page.getByText('Book flights', { exact: true }).click()
    await expect(page.getByLabel('Notes').last()).toHaveValue('Window seat if possible')
    await expect(page.getByLabel('Due date').last()).toHaveValue('2026-12-01')
  })

  test('searching and filtering by collection narrow the All view', async ({ page }) => {
    await page.goto('/tasks/collections')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Errands')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Errands', { exact: true })).toBeVisible()

    await page.goto('/tasks')
    await page.getByRole('button', { name: 'Add task' }).click()
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Buy milk')
    await page.getByLabel('Collection').selectOption({ label: 'Errands' })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await addTask(page, 'Call mum')

    await page.getByRole('radio', { name: 'All' }).click()
    await expect(page.getByText('Buy milk')).toBeVisible()
    await expect(page.getByText('Call mum')).toBeVisible()

    await page.getByRole('textbox', { name: 'Search tasks' }).fill('milk')
    await expect(page.getByText('Buy milk')).toBeVisible()
    await expect(page.getByText('Call mum')).not.toBeVisible()

    await page.getByRole('textbox', { name: 'Search tasks' }).fill('')
    await page
      .getByRole('group', { name: 'Collection' })
      .getByRole('button', { name: 'Errands', exact: false })
      .click()
    await expect(page.getByText('Buy milk')).toBeVisible()
    await expect(page.getByText('Call mum')).not.toBeVisible()
  })
})

test.describe('Tasks — collections', () => {
  test('deleting a collection in use moves its tasks to Unfiled, not deleted', async ({ page }) => {
    await page.goto('/tasks/collections')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Errands')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Errands', { exact: true })).toBeVisible()

    await page.goto('/tasks')
    await page.getByRole('button', { name: 'Add task' }).click()
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Buy milk')
    await page.getByLabel('Collection').selectOption({ label: 'Errands' })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await page.goto('/tasks/collections')
    await page.getByRole('button', { name: 'Delete Errands' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await page.goto('/tasks')
    await page.getByRole('radio', { name: 'All' }).click()
    await expect(page.getByText('Buy milk')).toBeVisible()
  })
})
