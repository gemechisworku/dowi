import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Covers the M5 Notes flow end to end against real IndexedDB: the Tiptap
 * editor's full mark/node set, autosave-survives-reload, grouping/density,
 * search over the body, pinning, collections' delete-with-choice, and
 * Trash restore.
 */

const NOTE_CONTENT = '[aria-label="Note content"]'

async function toolbarButton(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true })
}

async function newNote(page: Page, title: string) {
  await page.goto('/notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await expect(page).toHaveURL('/notes/new')
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title)
}

async function waitForSaved(page: Page) {
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
}

test.describe('Notes — editor formatting', () => {
  test('every supported mark and block node applies, and both survive a reload', async ({
    page,
  }) => {
    await newNote(page, 'Every format')
    const content = page.locator(NOTE_CONTENT)
    await content.click()

    // Simple marks: toggle on, type, toggle back *off* (clears it as a
    // "stored mark" for whatever's typed next), then Enter — verified
    // against the real editor that this never bleeds into the next line.
    async function markLine(text: string, buttonName: string) {
      await (await toolbarButton(page, buttonName)).click()
      await page.keyboard.type(text)
      await (await toolbarButton(page, buttonName)).click()
      await page.keyboard.press('Enter')
    }

    // Node wrappers (blockquote, lists): Enter creates a second, empty
    // node of the same type nested the same way (a second list item / a
    // second paragraph still inside the blockquote) — toggling the button
    // again afterward lifts only that trailing empty node back to a plain
    // paragraph, never touching the content just typed.
    async function wrapBlock(buttonName: string, text: string) {
      await (await toolbarButton(page, buttonName)).click()
      await page.keyboard.type(text)
      await page.keyboard.press('Enter')
      await (await toolbarButton(page, buttonName)).click()
    }

    // Headings: unlike the wrappers above, Tiptap's default Enter behaviour
    // *already* exits a heading to a plain paragraph — toggling the button
    // again here would wrongly turn that fresh paragraph back into a heading.
    async function headingBlock(buttonName: string, text: string) {
      await (await toolbarButton(page, buttonName)).click()
      await page.keyboard.type(text)
      await page.keyboard.press('Enter')
    }

    await markLine('Bold text', 'Bold')
    await markLine('Italic text', 'Italic')
    await markLine('Underline text', 'Underline')
    await markLine('Strikethrough text', 'Strikethrough')
    await markLine('Inline code text', 'Inline code')
    await wrapBlock('Quote', 'A quote')

    await (await toolbarButton(page, 'Highlight')).click()
    await page.getByRole('button', { name: 'Highlight Yellow' }).click()
    await page.keyboard.type('Highlighted text')
    await (await toolbarButton(page, 'Highlight')).click()
    await page.getByRole('button', { name: 'Remove highlight' }).click()
    await page.keyboard.press('Enter')

    // Link is deliberately not toggled back off here: Tiptap's `unsetLink`
    // command extends to and removes the *whole* link (unlike a plain
    // mark's toggle-off, which only clears pending state) — clicking it
    // again with the cursor still at the boundary would strip the link
    // mark from the text just typed, not just stop it applying to what's
    // typed next.
    page.once('dialog', (d) => d.accept('https://example.com'))
    await (await toolbarButton(page, 'Link')).click()
    await page.keyboard.type('Link text')
    await page.keyboard.press('Enter')

    await headingBlock('Heading 1', 'H1 heading')
    await headingBlock('Heading 2', 'H2 heading')
    await headingBlock('Heading 3', 'H3 heading')
    await wrapBlock('Bullet list', 'Bullet item')
    await wrapBlock('Numbered list', 'Numbered item')
    await wrapBlock('Checklist', 'Checklist item')

    // Code block: exits on three consecutive Enters at the end (Tiptap's
    // default `exitOnTripleEnter`), not a toolbar re-toggle.
    await (await toolbarButton(page, 'Code block')).click()
    await page.keyboard.type('const x = 1')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')

    await (await toolbarButton(page, 'Divider')).click()

    async function expectEveryFormat() {
      await expect(content.locator('h1')).toHaveText('H1 heading')
      await expect(content.locator('h2')).toHaveText('H2 heading')
      await expect(content.locator('h3')).toHaveText('H3 heading')
      await expect(content.locator('strong')).toContainText('Bold text')
      await expect(content.locator('em')).toContainText('Italic text')
      await expect(content.locator('u')).toContainText('Underline text')
      await expect(content.locator('s')).toContainText('Strikethrough text')
      await expect(content.locator('p code')).toContainText('Inline code text')
      await expect(content.locator('mark')).toContainText('Highlighted text')
      await expect(content.locator('a[href="https://example.com"]')).toContainText('Link text')
      await expect(content.locator('ul:not([data-type="taskList"]) li')).toContainText(
        'Bullet item',
      )
      await expect(content.locator('ol li')).toContainText('Numbered item')
      await expect(content.locator('ul[data-type="taskList"] li')).toContainText('Checklist item')
      await expect(content.locator('blockquote')).toContainText('A quote')
      await expect(content.locator('pre code')).toContainText('const x = 1')
      await expect(content.locator('hr')).toHaveCount(1)
    }

    await waitForSaved(page)
    await expectEveryFormat()

    await page.reload()
    await expectEveryFormat()
  })

  test('a highlight mark stays readable after switching to dark mode', async ({ page }) => {
    await newNote(page, 'Highlight readability')
    const content = page.locator(NOTE_CONTENT)
    await content.click()
    await (await toolbarButton(page, 'Highlight')).click()
    await page.getByRole('button', { name: 'Highlight Yellow' }).click()
    await page.keyboard.type('Important text')
    await waitForSaved(page)

    const mark = content.locator('mark')
    await expect(mark).toContainText('Important text')
    // The colour is a CSS variable reference so it resolves against
    // whichever theme is active (tokens.css's --note-highlight-* block) —
    // confirm the computed background actually changes between themes
    // rather than freezing at whatever it painted under. Forces *both*
    // explicit themes (not just "dark", which is a no-op on the "Pixel 7 ·
    // dark" project — its OS-level colour scheme already makes dark the
    // starting point) so the comparison is meaningful under either project.
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    const lightColor = await mark.evaluate((el) => getComputedStyle(el).backgroundColor)
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    const darkColor = await mark.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(darkColor).not.toBe(lightColor)
  })
})

test.describe('Notes — autosave', () => {
  test('typing autosaves (debounced) and survives a hard reload', async ({ page }) => {
    await newNote(page, 'Autosave check')
    await page.locator(NOTE_CONTENT).click()
    await page.keyboard.type('This sentence must survive a reload.')
    await waitForSaved(page)

    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
      'Autosave check',
    )
    await expect(page.locator(NOTE_CONTENT)).toContainText('This sentence must survive a reload.')
  })

  test('an untouched draft is never persisted as an empty note', async ({ page }) => {
    await page.goto('/notes')
    await page.getByRole('button', { name: 'New note' }).click()
    await expect(page).toHaveURL('/notes/new')
    await page.getByRole('button', { name: 'Back to Notes' }).click()
    await expect(page.getByText('No notes yet')).toBeVisible()
  })
})

test.describe('Notes — list, grouping and search', () => {
  test('grouping toggle persists across a reload', async ({ page }) => {
    await page.goto('/notes')
    await page.getByRole('radio', { name: 'By collection' }).click()
    await expect(page.getByRole('radio', { name: 'By collection' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.reload()
    await expect(page.getByRole('radio', { name: 'By collection' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('pinning a note floats it to the top of the first group', async ({ page }) => {
    await newNote(page, 'First note')
    await waitForSaved(page)
    await page.getByRole('button', { name: 'Back to Notes' }).click()

    await newNote(page, 'Second note')
    await waitForSaved(page)
    await page.getByRole('button', { name: 'Back to Notes' }).click()

    // "Second note" was updated more recently, so it renders first by
    // default — confirm that before pinning, then pin the *older* one and
    // confirm the order flips.
    const bodyText = () => page.locator('body').innerText()
    await expect
      .poll(
        async () =>
          (await bodyText()).indexOf('Second note') < (await bodyText()).indexOf('First note'),
      )
      .toBe(true)

    // Not `exact`, since a note row's own accessible name also *contains*
    // its trailing action buttons' labels (e.g. "First note Pin "First
    // note"") — the IconButton itself is the only exact match.
    await page.getByRole('button', { name: 'Pin "First note"', exact: true }).click()

    await expect
      .poll(
        async () =>
          (await bodyText()).indexOf('First note') < (await bodyText()).indexOf('Second note'),
      )
      .toBe(true)
  })

  test('search finds a note by text that only appears in the body', async ({ page }) => {
    await newNote(page, 'Grocery list')
    await page.locator(NOTE_CONTENT).click()
    await page.keyboard.type('remember to buy a rare unique-plumbus for the fridge')
    await waitForSaved(page)
    await page.getByRole('button', { name: 'Back to Notes' }).click()

    await page.getByRole('textbox', { name: 'Search notes' }).fill('unique-plumbus')
    await expect(page.getByText('Grocery list')).toBeVisible()

    await page.getByRole('textbox', { name: 'Search notes' }).fill('nonexistent-term-xyz')
    await expect(page.getByText('Grocery list')).not.toBeVisible()
  })
})

test.describe('Notes — collections', () => {
  async function addCollection(page: Page, name: string) {
    await page.goto('/notes/collections')
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  }

  test('deleting a collection with "move to Unfiled" keeps its notes', async ({ page }) => {
    await addCollection(page, 'Recipes')

    await newNote(page, 'Pasta')
    await page.getByLabel('Collection').selectOption({ label: 'Recipes' })
    await waitForSaved(page)
    await page.getByRole('button', { name: 'Back to Notes' }).click()

    await page.goto('/notes/collections')
    await page.getByRole('button', { name: 'Delete Recipes' }).click()
    await page.getByRole('button', { name: 'Move notes to Unfiled' }).click()
    // The dialog's own handler is async (repo writes, then setPendingDelete
    // to close it) — waiting for it to actually close before navigating
    // away is what guarantees those writes have landed, since a `page.goto`
    // full reload can otherwise cut the in-flight async work short.
    await expect(page.getByRole('alertdialog')).not.toBeVisible()

    await page.goto('/notes')
    await expect(page.getByText('Pasta')).toBeVisible()
  })

  test('deleting a collection with "delete notes too" trashes its notes', async ({ page }) => {
    await addCollection(page, 'Drafts')

    await newNote(page, 'Old draft')
    await page.getByLabel('Collection').selectOption({ label: 'Drafts' })
    await waitForSaved(page)
    await page.getByRole('button', { name: 'Back to Notes' }).click()

    await page.goto('/notes/collections')
    await page.getByRole('button', { name: 'Delete Drafts' }).click()
    await page.getByRole('button', { name: 'Delete notes too' }).click()
    await expect(page.getByRole('alertdialog')).not.toBeVisible()

    await page.goto('/notes')
    await expect(page.getByText('Old draft')).not.toBeVisible()

    await page.goto('/notes/trash')
    await expect(page.getByText('Old draft')).toBeVisible()
  })
})

test.describe('Notes — trash', () => {
  test('deleting a note from the editor sends it to Trash, and it can be restored', async ({
    page,
  }) => {
    await newNote(page, 'To be trashed')
    await page.locator(NOTE_CONTENT).click()
    await page.keyboard.type('Some content')
    await waitForSaved(page)

    await page.getByRole('button', { name: 'Delete note' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page).toHaveURL('/notes')
    await expect(page.getByText('To be trashed')).not.toBeVisible()

    await page.goto('/notes/trash')
    await expect(page.getByText('To be trashed')).toBeVisible()
    await page.getByRole('button', { name: 'Restore "To be trashed"' }).click()
    // Waits for the restore's own confirmation (an async repo write) before
    // the next line's full-reload navigation, for the same reason as the
    // collections-delete tests above.
    await expect(page.getByText('"To be trashed" restored')).toBeVisible()

    await page.goto('/notes')
    await expect(page.getByText('To be trashed')).toBeVisible()
  })
})
