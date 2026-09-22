import { useState } from 'react'
import { Dialog } from './Dialog'
import { Button } from './Button'
import { Input } from './Input'
import { matchesConfirmPhrase } from '@/lib/confirmPhrase'

export interface TypeToConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** The exact phrase the user must type, e.g. "ERASE". Case-sensitive, matched trimmed. */
  confirmPhrase: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A stricter sibling of `ConfirmDialog` for the one action in the app where
 * a plain confirm/cancel isn't enough friction — Settings → Data → Erase
 * all (PRD §5.8). Kept separate rather than added as a variant of
 * `ConfirmDialog`'s generic confirm/cancel API, which every other
 * destructive action in the app (delete a category, a note, a task, …)
 * uses as-is and shouldn't have to grow an unused `confirmPhrase` prop for.
 */
export function TypeToConfirmDialog({
  open,
  title,
  description,
  confirmPhrase,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: TypeToConfirmDialogProps) {
  const [input, setInput] = useState('')
  // Reset the typed text each time the dialog (re)opens, so a previous
  // confirmation's leftover text can't silently satisfy the next one.
  // Adjusted during render rather than in an effect — React's own
  // recommended pattern for "reset state when a prop changes"
  // (react.dev/learn/you-might-not-need-an-effect), which also sidesteps
  // the extra render an effect-based reset would cause.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setInput('')
  }

  const canConfirm = matchesConfirmPhrase(input, confirmPhrase)

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={!canConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {description && <p>{description}</p>}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Type "{confirmPhrase}" to confirm
          </span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={`Type ${confirmPhrase} to confirm`}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
      </div>
    </Dialog>
  )
}
