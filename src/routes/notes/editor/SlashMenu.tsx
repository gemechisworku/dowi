import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { filterSlashCommands, type SlashCommandItem, type SlashQuery } from './slashCommands'

export interface SlashMenuProps {
  editor: Editor
  slashQuery: SlashQuery
  onClose: () => void
}

/**
 * The `/` command popup itself — a plain positioned `<div>` driven by
 * Tiptap's own cursor-coordinate API (`view.coordsAtPos`), not a popup
 * library: the app has no floating-UI/tippy dependency already installed,
 * and a fixed-position list is all this needs.
 */
export function SlashMenu({ editor, slashQuery, onClose }: SlashMenuProps) {
  const [highlighted, setHighlighted] = useState(0)
  const commands = filterSlashCommands(slashQuery.query)

  // Resets the highlighted row whenever the query text changes (typing
  // narrows the list) — adjusted directly during render rather than in an
  // effect, per React's "adjusting state when a prop changes" pattern, so
  // it can't cause an extra committed render with the stale highlight.
  const [prevQuery, setPrevQuery] = useState(slashQuery.query)
  if (slashQuery.query !== prevQuery) {
    setPrevQuery(slashQuery.query)
    setHighlighted(0)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (commands.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlighted((i) => (i + 1) % commands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlighted((i) => (i - 1 + commands.length) % commands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        runCommand(commands[highlighted] ?? commands[0]!)
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [commands, highlighted]) // eslint-disable-line react-hooks/exhaustive-deps

  function runCommand(command: SlashCommandItem) {
    editor.chain().focus().deleteRange(slashQuery.range).run()
    command.run(editor)
    onClose()
  }

  if (commands.length === 0) return null

  const coords = editor.view.coordsAtPos(slashQuery.range.from)
  const top = Math.min(coords.bottom + 6, window.innerHeight - 260)
  const left = Math.min(coords.left, window.innerWidth - 260)

  return (
    <div
      role="listbox"
      aria-label="Insert block"
      className="fixed z-50 max-h-64 w-60 overflow-y-auto rounded-[var(--radius-md)] py-1.5"
      style={{ top, left, background: 'var(--color-surface)', boxShadow: 'var(--shadow-elevated)' }}
    >
      {commands.map((command, i) => (
        <button
          key={command.id}
          type="button"
          role="option"
          aria-selected={i === highlighted}
          onMouseDown={(e) => {
            e.preventDefault()
            runCommand(command)
          }}
          onMouseEnter={() => setHighlighted(i)}
          className="flex w-full flex-col items-start px-3 py-2 text-left"
          style={{ background: i === highlighted ? 'var(--color-surface-2)' : undefined }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {command.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {command.hint}
          </span>
        </button>
      ))}
    </div>
  )
}
