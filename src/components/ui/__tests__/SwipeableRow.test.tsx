import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SwipeableRow } from '../SwipeableRow'

describe('SwipeableRow', () => {
  it('keeps the destructive action hidden until the row moves', () => {
    const onDelete = vi.fn()
    render(
      <SwipeableRow onSwipeLeft={onDelete}>
        <span>List row</span>
      </SwipeableRow>,
    )

    const action = screen.getByText('Delete')
    const row = screen.getByText('List row').parentElement

    expect(action).toHaveStyle({ opacity: 0 })
    expect(row).toHaveStyle({ background: 'var(--color-surface-solid)' })

    if (!row) throw new Error('Swipe row was not rendered')
    fireEvent.pointerDown(row, { clientX: 120 })
    fireEvent.pointerMove(row, { clientX: 80 })

    expect(action).toHaveStyle({ opacity: 1 })
  })
})