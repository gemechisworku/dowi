import { describe, expect, it } from 'vitest'
import { nextTourIndex } from '../tourNav'
import { TOUR_STEPS } from '../tourContent'

describe('nextTourIndex', () => {
  it('advances by one on "next"', () => {
    expect(nextTourIndex(TOUR_STEPS, 0, 'next')).toBe(1)
  })

  it('does not advance past the last step', () => {
    expect(nextTourIndex(TOUR_STEPS, TOUR_STEPS.length - 1, 'next')).toBe(TOUR_STEPS.length - 1)
  })

  it('goes back by one on "back"', () => {
    expect(nextTourIndex(TOUR_STEPS, 2, 'back')).toBe(1)
  })

  it('does not go back past the first step', () => {
    expect(nextTourIndex(TOUR_STEPS, 0, 'back')).toBe(0)
  })

  it('jumps to the first step of the requested category', () => {
    const tasksFirstIndex = TOUR_STEPS.findIndex((s) => s.category === 'tasks')
    expect(nextTourIndex(TOUR_STEPS, 0, { jumpToCategory: 'tasks' })).toBe(tasksFirstIndex)
    expect(nextTourIndex(TOUR_STEPS, tasksFirstIndex + 1, { jumpToCategory: 'money' })).toBe(0)
  })

  it('jumping to the category already showing is a no-op landing on its first step', () => {
    const notesFirstIndex = TOUR_STEPS.findIndex((s) => s.category === 'notes')
    expect(nextTourIndex(TOUR_STEPS, notesFirstIndex + 1, { jumpToCategory: 'notes' })).toBe(
      notesFirstIndex,
    )
  })
})
