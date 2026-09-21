import type { Editor } from '@tiptap/react'

export interface SlashCommandItem {
  id: string
  label: string
  hint: string
  run: (editor: Editor) => void
}

/** The `/` slash-menu's command list (PRD §5.5) — every block-level node the toolbar also exposes. */
export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    hint: 'Big section heading',
    run: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'Medium section heading',
    run: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'Small section heading',
    run: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'bulleted',
    label: 'Bullet list',
    hint: 'A simple bulleted list',
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    hint: 'A list with numbering',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'checklist',
    label: 'Checklist',
    hint: 'Track tasks with checkboxes',
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'Capture a quote',
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    label: 'Code block',
    hint: 'A block of code',
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'A horizontal dividing rule',
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
]

export interface SlashQuery {
  range: { from: number; to: number }
  query: string
}

/**
 * Detects a "/command" trigger just before the cursor, within the current
 * text block only (never crossing a block boundary) — pure and testable
 * without mounting an editor (see SlashMenu.test.ts). Triggers on a `/` at
 * the very start of the block or right after whitespace, so a literal
 * slash inside a URL or a fraction like "3/4" doesn't pop the menu.
 */
export function findSlashQuery(editor: Editor): SlashQuery | null {
  const { selection } = editor.state
  if (!selection.empty) return null
  const { $from } = selection
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
  const match = /(?:^|\s)\/([a-zA-Z]*)$/.exec(textBefore)
  if (!match) return null
  const query = match[1] ?? ''
  const from = $from.pos - query.length - 1
  return { range: { from, to: $from.pos }, query }
}

/** Commands whose label contains `query` (case-insensitive); everything, unfiltered, for an empty query. */
export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
}
