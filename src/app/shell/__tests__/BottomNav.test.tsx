import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BottomNav } from '../BottomNav'

describe('BottomNav', () => {
  it('renders all four primary destinations', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Home/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Money/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Notes/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tasks/ })).toBeInTheDocument()
  })

  it('marks the current route as active', () => {
    render(
      <MemoryRouter initialEntries={['/money']}>
        <BottomNav />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Money/ })).toHaveAttribute('aria-current', 'page')
  })
})
