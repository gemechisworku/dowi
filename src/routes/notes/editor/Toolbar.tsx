import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { HIGHLIGHT_COLORS } from '../editorExtensions'

export interface ToolbarProps {
  editor: Editor
}

interface ToolbarButtonProps {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // onMouseDown (not onClick) so the editor's text selection isn't lost
      // to the toolbar button stealing focus before the command runs.
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-semibold"
      style={{
        background: active ? 'var(--color-primary)' : 'var(--color-surface-2)',
        color: active ? 'var(--color-primary-fg)' : 'var(--color-text)',
      }}
    >
      {children}
    </button>
  )
}

/**
 * The formatting toolbar (PRD §5.5). Rendered as the last flex child below
 * the editor's own scrollable content area (see NoteEditor.tsx), not via
 * CSS `position: sticky` inside that scroller — a flex-column layout that
 * fills the viewport height keeps this row pinned just above wherever the
 * on-screen keyboard currently ends, without needing visualViewport-inset
 * JS that behaves inconsistently across mobile browsers.
 */
export function Toolbar({ editor }: ToolbarProps) {
  const [highlightOpen, setHighlightOpen] = useState(false)

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      taskList: e.isActive('taskList'),
      blockquote: e.isActive('blockquote'),
      code: e.isActive('code'),
      codeBlock: e.isActive('codeBlock'),
      link: e.isActive('link'),
    }),
  })

  function toggleLink() {
    if (state.link) {
      editor.chain().focus().unsetLink().run()
      return
    }
    // The kit has no dedicated URL-prompt component; a native prompt is the smallest thing that works.
    const url = window.prompt('Link URL')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div
      className="flex shrink-0 flex-col border-t"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {highlightOpen && (
        <div
          className="flex items-center gap-2 border-b px-3 py-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={`Highlight ${c.label}`}
              onMouseDown={(e) => {
                e.preventDefault()
                editor.chain().focus().setHighlight({ color: c.value }).run()
                setHighlightOpen(false)
              }}
              className="h-7 w-7 rounded-full"
              style={{ background: c.value, border: '1px solid var(--color-border-strong)' }}
            />
          ))}
          <button
            type="button"
            aria-label="Remove highlight"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().unsetHighlight().run()
              setHighlightOpen(false)
            }}
            className="ml-1 text-xs font-semibold underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            None
          </button>
        </div>
      )}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-col gap-1.5 px-2.5 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]"
      >
        {/* Row 1: text style + inline marks */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarButton
            label="Heading 1"
            active={state.h1}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={state.h2}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            label="Heading 3"
            active={state.h3}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            label="Bold"
            active={state.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={state.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={state.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span style={{ textDecoration: 'underline' }}>U</span>
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={state.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </ToolbarButton>
          <ToolbarButton
            label="Highlight"
            active={state.highlight || highlightOpen}
            onClick={() => setHighlightOpen((open) => !open)}
          >
            ⬛
          </ToolbarButton>
        </div>

        {/* Row 2: block structure + insertions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarButton
            label="Bullet list"
            active={state.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •—
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={state.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            label="Checklist"
            active={state.taskList}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={state.blockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </ToolbarButton>
          <ToolbarButton
            label="Inline code"
            active={state.code}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            active={state.codeBlock}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {'{ }'}
          </ToolbarButton>
          <ToolbarButton
            label="Divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            ―
          </ToolbarButton>
          <ToolbarButton label="Link" active={state.link} onClick={toggleLink}>
            🔗
          </ToolbarButton>
        </div>
      </div>
    </div>
  )
}
