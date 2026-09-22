import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { createNoteExtensions } from '../../editorExtensions'
import { filterSlashCommands, findSlashQuery, SLASH_COMMANDS } from '../slashCommands'

function editorWithText(text: string): Editor {
  return new Editor({
    extensions: createNoteExtensions(),
    content: `<p>${text}</p>`,
  })
}

describe('findSlashQuery', () => {
  let editor: Editor | null = null
  afterEach(() => {
    editor?.destroy()
    editor = null
  })

  it('detects a bare "/" at the end of the block', () => {
    editor = editorWithText('/')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    const result = findSlashQuery(editor)
    expect(result).not.toBeNull()
    expect(result!.query).toBe('')
  })

  it('detects "/head" as an in-progress query', () => {
    editor = editorWithText('/head')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    const result = findSlashQuery(editor)
    expect(result?.query).toBe('head')
  })

  it('does not trigger for a slash in the middle of a word (e.g. "3/4")', () => {
    editor = editorWithText('3/4')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    expect(findSlashQuery(editor)).toBeNull()
  })

  it('does not trigger once the cursor has moved past the query with a space', () => {
    editor = editorWithText('/heading and more')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    expect(findSlashQuery(editor)).toBeNull()
  })

  it('the detected range spans exactly "/" + query', () => {
    editor = editorWithText('/quo')
    const endPos = editor.state.doc.content.size - 1
    editor.commands.setTextSelection(endPos)
    const result = findSlashQuery(editor)!
    expect(result.range.to - result.range.from).toBe('/quo'.length)
  })
})

describe('filterSlashCommands', () => {
  it('returns every command for an empty query', () => {
    expect(filterSlashCommands('')).toEqual(SLASH_COMMANDS)
  })

  it('filters case-insensitively by label substring', () => {
    const results = filterSlashCommands('head')
    expect(results.map((c) => c.id)).toEqual(['h1', 'h2', 'h3'])
  })

  it('returns nothing for a query that matches no command', () => {
    expect(filterSlashCommands('zzz')).toEqual([])
  })
})
