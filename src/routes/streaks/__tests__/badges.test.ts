import { describe, expect, it } from 'vitest'
import { BADGE_TIERS, countUnlockedBadges, isBadgeUnlocked, nextBadgeTier } from '../badges'

describe('isBadgeUnlocked', () => {
  it('is unlocked once the longest streak reaches the tier', () => {
    const tier = BADGE_TIERS.find((t) => t.days === 30)!
    expect(isBadgeUnlocked(tier, 30)).toBe(true)
    expect(isBadgeUnlocked(tier, 45)).toBe(true)
  })

  it('is locked below the tier', () => {
    const tier = BADGE_TIERS.find((t) => t.days === 30)!
    expect(isBadgeUnlocked(tier, 29)).toBe(false)
    expect(isBadgeUnlocked(tier, 0)).toBe(false)
  })
})

describe('countUnlockedBadges', () => {
  it('counts every tier at or below the longest streak', () => {
    // 3, 7, 14 unlocked at 20; 21 and beyond not yet.
    expect(countUnlockedBadges(20)).toBe(3)
  })

  it('is 0 for a streak below the first tier', () => {
    expect(countUnlockedBadges(1)).toBe(0)
  })

  it('is every tier once past the top of the ladder', () => {
    expect(countUnlockedBadges(1000)).toBe(BADGE_TIERS.length)
  })
})

describe('nextBadgeTier', () => {
  it('is the first not-yet-reached tier', () => {
    expect(nextBadgeTier(20)?.days).toBe(21)
  })

  it('is undefined once every tier is unlocked', () => {
    expect(nextBadgeTier(1000)).toBeUndefined()
  })
})
