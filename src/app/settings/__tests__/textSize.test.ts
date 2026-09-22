import { describe, expect, it } from 'vitest'
import { normalizeTextSize } from '../textSize'

describe('normalizeTextSize', () => {
  it('passes through each known size', () => {
    expect(normalizeTextSize('s')).toBe('s')
    expect(normalizeTextSize('m')).toBe('m')
    expect(normalizeTextSize('l')).toBe('l')
  })

  it('falls back to "m" for anything unrecognised', () => {
    expect(normalizeTextSize('xl')).toBe('m')
    expect(normalizeTextSize(undefined)).toBe('m')
    expect(normalizeTextSize(null)).toBe('m')
    expect(normalizeTextSize(42)).toBe('m')
  })
})
