import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import { deriveContentText, EMPTY_DOC } from '../editorExtensions'

// A representative doc exercising most of the required node/mark set (PRD
// §5.5): heading, paragraph with bold/italic marks, a bullet list and a
// checklist — deriveContentText must strip all formatting down to plain
// words, in document order, which is what powers search (AC-N5).
const SAMPLE_DOC: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Meeting notes' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Discuss the ', marks: [] },
        { type: 'text', text: 'budget', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' with the ', marks: [] },
        { type: 'text', text: 'plumber', marks: [{ type: 'italic' }] },
        { type: 'text', text: '.', marks: [] },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Book flights' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Book hotel' }] }],
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Call the plumber' }] }],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A quote' }] }],
    },
    { type: 'codeBlock', content: [{ type: 'text', text: 'const x = 1' }] },
  ],
}

describe('deriveContentText', () => {
  it('strips marks and concatenates the text nodes from every required node type', () => {
    const text = deriveContentText(SAMPLE_DOC)
    for (const word of [
      'Meeting notes',
      'Discuss the',
      'budget',
      'plumber',
      'Book flights',
      'Book hotel',
      'Call the plumber',
      'A quote',
      'const x = 1',
    ]) {
      expect(text).toContain(word)
    }
    // Marks themselves must not leak into the plain text.
    expect(text).not.toMatch(/<\/?(b|i|strong|em)>/)
  })

  it('is search-matchable on text that only appears deep in the body (AC-N5)', () => {
    const text = deriveContentText(SAMPLE_DOC).toLowerCase()
    expect(text).toContain('plumber')
  })

  it('returns an empty string for an empty doc', () => {
    expect(deriveContentText(EMPTY_DOC)).toBe('')
  })

  it('returns an empty string rather than throwing for null/undefined/malformed input', () => {
    expect(deriveContentText(undefined)).toBe('')
    expect(deriveContentText(null)).toBe('')
    // Deliberately malformed — mirrors a corrupted/legacy record.
    expect(deriveContentText({ not: 'a doc' } as unknown as JSONContent)).toBe('')
  })
})
