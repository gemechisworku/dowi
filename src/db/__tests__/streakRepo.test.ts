import { describe, expect, it } from 'vitest'
import {
  applyQualifyingActivity,
  createStreakRepo,
  DEFAULT_STREAK_STATE,
  isNewMilestone,
  type StreakState,
} from '../streakRepo'
import { createTestDb } from './testDb'

function state(overrides: Partial<StreakState> = {}): StreakState {
  return { ...DEFAULT_STREAK_STATE, ...overrides }
}

describe('applyQualifyingActivity', () => {
  it('starts a 1-day streak from nothing', () => {
    const next = applyQualifyingActivity(state(), '2026-09-22')
    expect(next).toMatchObject({ currentStreak: 1, longestStreak: 1, lastActiveDate: '2026-09-22' })
  })

  it('extends the streak for a consecutive day', () => {
    const prev = state({ currentStreak: 3, longestStreak: 3, lastActiveDate: '2026-09-21' })
    const next = applyQualifyingActivity(prev, '2026-09-22')
    expect(next).toMatchObject({ currentStreak: 4, longestStreak: 4, lastActiveDate: '2026-09-22' })
  })

  it('is a no-op for a second action on the same day (not a double-count)', () => {
    const prev = state({ currentStreak: 4, longestStreak: 4, lastActiveDate: '2026-09-22' })
    const next = applyQualifyingActivity(prev, '2026-09-22')
    expect(next).toBe(prev)
  })

  it('resets to 1 after a gap of more than one day', () => {
    const prev = state({ currentStreak: 6, longestStreak: 6, lastActiveDate: '2026-09-18' })
    const next = applyQualifyingActivity(prev, '2026-09-22')
    expect(next).toMatchObject({ currentStreak: 1, lastActiveDate: '2026-09-22' })
    expect(next.longestStreak).toBe(6) // the record isn't erased by a reset
  })

  it('keeps longestStreak as the historical max, not the current value', () => {
    const prev = state({ currentStreak: 10, longestStreak: 10, lastActiveDate: '2026-09-18' })
    const next = applyQualifyingActivity(prev, '2026-09-22') // gap -> resets to 1
    expect(next.currentStreak).toBe(1)
    expect(next.longestStreak).toBe(10)
  })

  it('handles a month boundary as a genuinely consecutive day', () => {
    const prev = state({ currentStreak: 1, longestStreak: 1, lastActiveDate: '2026-08-31' })
    const next = applyQualifyingActivity(prev, '2026-09-01')
    expect(next.currentStreak).toBe(2)
  })
})

describe('isNewMilestone', () => {
  it('is false below 7', () => {
    expect(isNewMilestone(state({ currentStreak: 6 }))).toBe(false)
  })

  it('is true exactly at 7 when not yet celebrated', () => {
    expect(isNewMilestone(state({ currentStreak: 7, lastCelebratedStreak: 0 }))).toBe(true)
  })

  it('is false at 7 once already celebrated', () => {
    expect(isNewMilestone(state({ currentStreak: 7, lastCelebratedStreak: 7 }))).toBe(false)
  })

  it('is true again at the next multiple, 14', () => {
    expect(isNewMilestone(state({ currentStreak: 14, lastCelebratedStreak: 7 }))).toBe(true)
  })

  it('is false between multiples', () => {
    expect(isNewMilestone(state({ currentStreak: 10, lastCelebratedStreak: 7 }))).toBe(false)
  })

  it('is false at zero', () => {
    expect(isNewMilestone(state({ currentStreak: 0 }))).toBe(false)
  })
})

describe('createStreakRepo', () => {
  it('defaults to zero state when nothing has been recorded', async () => {
    const repo = createStreakRepo(createTestDb())
    expect(await repo.get()).toEqual(DEFAULT_STREAK_STATE)
  })

  it('records a qualifying activity and persists it', async () => {
    const repo = createStreakRepo(createTestDb())
    const result = await repo.recordQualifyingActivity('2026-09-22')
    expect(result.currentStreak).toBe(1)
    expect(await repo.get()).toEqual(result)
  })

  it('does not double-count two activities on the same day', async () => {
    const repo = createStreakRepo(createTestDb())
    await repo.recordQualifyingActivity('2026-09-22')
    const second = await repo.recordQualifyingActivity('2026-09-22')
    expect(second.currentStreak).toBe(1)
  })

  it('extends across consecutive recorded days', async () => {
    const repo = createStreakRepo(createTestDb())
    await repo.recordQualifyingActivity('2026-09-20')
    await repo.recordQualifyingActivity('2026-09-21')
    const third = await repo.recordQualifyingActivity('2026-09-22')
    expect(third.currentStreak).toBe(3)
  })

  it('markCelebrated persists lastCelebratedStreak without touching the rest of the state', async () => {
    const repo = createStreakRepo(createTestDb())
    await repo.recordQualifyingActivity('2026-09-22')
    const celebrated = await repo.markCelebrated(1)
    expect(celebrated).toMatchObject({ currentStreak: 1, lastCelebratedStreak: 1 })
    expect(await repo.get()).toEqual(celebrated)
  })
})
