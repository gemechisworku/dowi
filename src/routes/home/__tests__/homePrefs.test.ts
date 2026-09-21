import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readHomePeriod, writeHomePeriod } from '../homePrefs'

describe('homePrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to "month" when nothing is stored', () => {
    expect(readHomePeriod()).toBe('month')
  })

  it('round-trips a written period', () => {
    writeHomePeriod('week')
    expect(readHomePeriod()).toBe('week')

    writeHomePeriod('year')
    expect(readHomePeriod()).toBe('year')
  })

  it('falls back to the default for a corrupted/unexpected stored value', () => {
    localStorage.setItem('dowi:home:period', 'day')
    expect(readHomePeriod()).toBe('month')
  })

  it('falls back silently when localStorage access throws', () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readHomePeriod()).toBe('month')
    getSpy.mockRestore()

    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writeHomePeriod('year')).not.toThrow()
    setSpy.mockRestore()
  })
})
