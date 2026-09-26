/**
 * Milestone badge ladder for the streak page (M13) — a denser ladder with
 * early quick wins, per common practice in habit-tracking apps (an early
 * micro-win like day 3 matters for retention; 100 days is a widely-used
 * "identity" milestone). Unlocks off `longestStreak`, not the current
 * streak, so a badge earned once stays earned even after the streak later
 * resets — it's a record of what you've done, not a live gauge.
 */
export interface BadgeTier {
  days: number
  name: string
  icon: string
}

export const BADGE_TIERS: readonly BadgeTier[] = [
  { days: 3, name: 'Spark', icon: '✨' },
  { days: 7, name: 'Week One', icon: '🔥' },
  { days: 14, name: 'Fortnight', icon: '🌟' },
  { days: 21, name: 'Habit Formed', icon: '💪' },
  { days: 30, name: 'Month Strong', icon: '🏅' },
  { days: 60, name: 'Two Months', icon: '🎖️' },
  { days: 100, name: 'Century Club', icon: '💯' },
  { days: 180, name: 'Half Year', icon: '🏆' },
  { days: 365, name: 'Year One', icon: '👑' },
]

export function isBadgeUnlocked(tier: BadgeTier, longestStreak: number): boolean {
  return longestStreak >= tier.days
}

/** How many tiers are currently unlocked, for a compact "X / N badges" summary. */
export function countUnlockedBadges(longestStreak: number): number {
  return BADGE_TIERS.filter((tier) => isBadgeUnlocked(tier, longestStreak)).length
}

/** The next tier still to reach, or undefined once every tier is unlocked. */
export function nextBadgeTier(longestStreak: number): BadgeTier | undefined {
  return BADGE_TIERS.find((tier) => !isBadgeUnlocked(tier, longestStreak))
}
