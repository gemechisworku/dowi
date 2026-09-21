import { useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import { createNoteExtensions, deriveContentText } from '../editorExtensions'
import { Toolbar } from './Toolbar'
import { SlashMenu } from './SlashMenu'
import { findSlashQuery, type SlashQuery } from './slashCommands'
import './notes-content.css'

export interface NoteEditorProps {
  initialContent: JSONContent
  onChange: (json: JSONContent, text: string) => void
  autoFocus?: boolean
}

/**
 * The Tiptap-heavy part of the note editor (PRD §5.5) — everything that
 * needs the `@tiptap/*` packages lives in this component specifically so it
 * stays inside the lazy chunk `NoteEditorPage.tsx` loads via `React.lazy`;
 * the page shell around it (title field, header, autosave bookkeeping)
 * stays in the eagerly-bundled parent, which never touches Tiptap's own
 * imports.
 *
 * `initialContent` is only read on mount (Tiptap owns the document after
 * that) — NoteEditorPage remounts this component with a `key={noteId}`
 * whenever it switches to a different note, rather than pushing new content
 * in via a prop update.
 */
export default function NoteEditor({
  initialContent,
  onChange,
  autoFocus = false,
}: NoteEditorProps) {
  const [slashQuery, setSlashQuery] = useState<SlashQuery | null>(null)

  const editor = useEditor({
    extensions: createNoteExtensions(),
    content: initialContent,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'dowi-note-content',
        // A plain contenteditable div carries no implicit ARIA role axe
        // will recognise, so `aria-label` alone on it is flagged as
        // "prohibited" (aria-prohibited-attr) — role="textbox" plus
        // aria-multiline makes it an accessible multi-line text input,
        // matching what it actually is.
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Note content',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange(json, deriveContentText(json))
      setSlashQuery(findSlashQuery(editor))
    },
    onSelectionUpdate: ({ editor }) => {
      setSlashQuery(findSlashQuery(editor))
    },
  })

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <EditorContent editor={editor} />
      </div>
      {slashQuery && (
        <SlashMenu editor={editor} slashQuery={slashQuery} onClose={() => setSlashQuery(null)} />
      )}
      <Toolbar editor={editor} />
    </div>
  )
}
