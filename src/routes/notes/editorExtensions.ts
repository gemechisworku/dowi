import { generateText, type Extensions, type JSONContent } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Placeholder } from '@tiptap/extension-placeholder'
export { EMPTY_DOC } from './emptyDoc'

/**
 * The editor's extension set (PRD §5.5's required mark/node list: H1-H3,
 * paragraph, bold, italic, underline, strike, highlight, bullet/ordered
 * list, checklist, blockquote, inline code, code block, rule, link).
 * StarterKit v3 already bundles Underline and Link (unlike v2, where they
 * shipped as separate packages installed alongside it) — only Highlight,
 * the checklist pair and Placeholder need adding on top.
 *
 * Exported as a factory (not a singleton array) because Tiptap extension
 * instances are stateful per Editor; the live editor (NoteEditor) and
 * `deriveContentText` below each need their own instances, built from
 * identical configuration so "what the editor can produce" and "what
 * contentText is derived from" never drift apart.
 */
export function createNoteExtensions(placeholder = 'Start writing…'): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, linkOnPaste: true },
    }),
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder }),
  ]
}

/**
 * The highlight colour choices (PRD §5.5 "highlight (colour choice)").
 * Values are CSS custom-property references, not hex — Tiptap's Highlight
 * mark writes whatever string it's given straight into an inline
 * `background-color` style, so storing a var() reference means a note's
 * stored contentJSON keeps resolving to the *current* theme's tokens
 * (tokens.css) at render time instead of freezing in whichever theme it
 * was painted in. See tokens.css's `--note-highlight-*` block for the
 * light/dark values themselves.
 */
export const HIGHLIGHT_COLORS: { value: string; label: string }[] = [
  { value: 'var(--note-highlight-yellow)', label: 'Yellow' },
  { value: 'var(--note-highlight-green)', label: 'Green' },
  { value: 'var(--note-highlight-blue)', label: 'Blue' },
  { value: 'var(--note-highlight-pink)', label: 'Pink' },
]

/**
 * Plain-text derived from a Tiptap JSON doc, for search (Note.contentText).
 * Built on Tiptap's own `generateText` against the same extension set the
 * editor renders with, rather than a hand-rolled tree walker — this is also
 * what makes contentText derivation unit-testable against a plain JSON
 * fixture with no editor/DOM instance required (see editorExtensions.test.ts).
 */
export function deriveContentText(doc: JSONContent | null | undefined): string {
  if (!doc || typeof doc !== 'object') return ''
  try {
    return generateText(doc, createNoteExtensions(), { blockSeparator: ' ' })
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    // A malformed/legacy doc shape should never crash search or autosave —
    // worst case, that one note just doesn't match a body search.
    return ''
  }
}
