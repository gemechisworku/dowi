import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readDensity, readGroupingMode, writeDensity, writeGroupingMode } from '../notePrefs'

describe('notePrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to "date" grouping and "list" density when nothing is stored', () => {
    expect(readGroupingMode()).toBe('date')
    expect(readDensity()).toBe('list')
  })

  it('round-trips a written preference', () => {
    writeGroupingMode('collection')
    expect(readGroupingMode()).toBe('collection')

    writeDensity('card')
    expect(readDensity()).toBe('card')
  })

  it('falls back to the default for a corrupted/unexpected stored value', () => {
    localStorage.setItem('dowi:notes:grouping', 'nonsense')
    localStorage.setItem('dowi:notes:density', 'nonsense')
    expect(readGroupingMode()).toBe('date')
    expect(readDensity()).toBe('list')
  })

  it('falls back silently when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readGroupingMode()).toBe('date')
    expect(readDensity()).toBe('list')
    spy.mockRestore()
  })
})
