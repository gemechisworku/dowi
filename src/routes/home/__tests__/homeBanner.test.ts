import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissBannerForToday, getBannerKind, isBannerDismissed } from '../homeBanner'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'

// 2026-09-21 is a Monday (matches DEFAULT_SETTINGS.reminders.weeklyPlan.day = 1).
const MONDAY = '2026-09-21'
const SATURDAY = '2026-09-26' // matches DEFAULT_SETTINGS.reminders.weeklyReview.day = 6
const TUESDAY = '2026-09-22'

describe('getBannerKind', () => {
  it('is "plan" on the configured plan day', () => {
    expect(getBannerKind(DEFAULT_SETTINGS.reminders, MONDAY)).toBe('plan')
  })

  it('is "review" on the configured review day', () => {
    expect(getBannerKind(DEFAULT_SETTINGS.reminders, SATURDAY)).toBe('review')
  })

  it('is null on a day that is neither', () => {
    expect(getBannerKind(DEFAULT_SETTINGS.reminders, TUESDAY)).toBeNull()
  })

  it('prefers "plan" when both are configured for the same day', () => {
    const reminders = {
      weeklyPlan: { ...DEFAULT_SETTINGS.reminders.weeklyPlan, day: 3 },
      weeklyReview: { ...DEFAULT_SETTINGS.reminders.weeklyReview, day: 3 },
    }
    expect(getBannerKind(reminders, '2026-09-23')).toBe('plan') // a Wednesday
  })

  it('does not depend on the reminder being enabled', () => {
    const reminders = {
      weeklyPlan: { ...DEFAULT_SETTINGS.reminders.weeklyPlan, enabled: false },
      weeklyReview: DEFAULT_SETTINGS.reminders.weeklyReview,
    }
    expect(getBannerKind(reminders, MONDAY)).toBe('plan')
  })
})

describe('banner dismissal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is not dismissed until dismissBannerForToday is called', () => {
    expect(isBannerDismissed(MONDAY)).toBe(false)
  })

  it('is dismissed for the day it was dismissed on', () => {
    dismissBannerForToday(MONDAY)
    expect(isBannerDismissed(MONDAY)).toBe(true)
  })

  it('reappears on a different day', () => {
    dismissBannerForToday(MONDAY)
    expect(isBannerDismissed(TUESDAY)).toBe(false)
  })

  it('fails open (not dismissed) when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(isBannerDismissed(MONDAY)).toBe(false)
    spy.mockRestore()
  })
})
