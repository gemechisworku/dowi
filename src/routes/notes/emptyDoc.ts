import type { JSONContent } from '@tiptap/core'

/**
 * A brand-new, empty Tiptap document. Deliberately its own tiny module with
 * no runtime import of any `@tiptap/*` package (only a type-only import,
 * which is erased at build time) — `NoteEditorPage.tsx` needs this literal
 * to seed a draft note *before* the Tiptap editor chunk has loaded, and
 * importing it from `editorExtensions.ts` instead would drag that whole
 * lazy chunk into the eagerly-bundled route (see PLAN.md's M5 writeup on
 * why the editor is a separate `React.lazy` chunk).
 */
export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
