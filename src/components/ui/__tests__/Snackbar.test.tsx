import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SnackbarProvider } from '../SnackbarProvider'
import { useSnackbar } from '../useSnackbar'

function Demo() {
  const { show } = useSnackbar()
  return (
    <button
      type="button"
      onClick={() =>
        show({ message: 'Transaction deleted', action: { label: 'Undo', onClick: vi.fn() } })
      }
    >
      Delete
    </button>
  )
}

describe('SnackbarProvider', () => {
  it('shows a message with an action after show() is called', async () => {
    render(
      <SnackbarProvider>
        <Demo />
      </SnackbarProvider>,
    )
    expect(screen.queryByText('Transaction deleted')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByText('Transaction deleted')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('runs the action callback and dismisses when the action is clicked', async () => {
    const onUndo = vi.fn()

    function DemoWithSpy() {
      const { show } = useSnackbar()
      return (
        <button
          type="button"
          onClick={() =>
            show({ message: 'Transaction deleted', action: { label: 'Undo', onClick: onUndo } })
          }
        >
          Delete
        </button>
      )
    }

    render(
      <SnackbarProvider>
        <DemoWithSpy />
      </SnackbarProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))

    expect(onUndo).toHaveBeenCalledOnce()
    expect(screen.queryByText('Transaction deleted')).not.toBeInTheDocument()
  })

  it('throws a clear error when useSnackbar is used outside a provider', () => {
    function Broken() {
      useSnackbar()
      return null
    }
    // Suppress React's expected error-boundary console noise for this assertion.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Broken />)).toThrow('useSnackbar must be used within a SnackbarProvider')
    spy.mockRestore()
  })
})
