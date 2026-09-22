import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissTour, isTourDismissed } from '../homeTour'

describe('getting-started tour dismissal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is not dismissed until dismissTour is called', () => {
    expect(isTourDismissed()).toBe(false)
  })

  it('stays dismissed once dismissTour is called', () => {
    dismissTour()
    expect(isTourDismissed()).toBe(true)
  })

  it('fails open (not dismissed) when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(isTourDismissed()).toBe(false)
    spy.mockRestore()
  })

  it('silently ignores a write failure', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => dismissTour()).not.toThrow()
    spy.mockRestore()
  })
})
