import { cn } from '@/lib/cn'

export interface AmountKeypadProps {
  value: string
  onChange: (value: string) => void
  decimals?: number
  className?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

/**
 * A large-target numeric keypad for fast money entry (PRD G1 — ≤10s, ≤4
 * taps). Purpose-built rather than the OS keyboard so the amount field
 * never triggers autocorrect/predictive-text UI on top of the sheet.
 */
export function AmountKeypad({ value, onChange, decimals = 2, className }: AmountKeypadProps) {
  function press(key: string) {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '.' && (decimals === 0 || value.includes('.'))) return
    const next = value + key
    const [, fraction] = next.split('.')
    if (fraction && fraction.length > decimals) return
    onChange(next)
  }

  return (
    <div
      className={cn('grid grid-cols-3 gap-2', className)}
      role="group"
      aria-label="Amount keypad"
    >
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === '⌫' ? 'Backspace' : key === '.' ? 'Decimal point' : key}
          className="flex h-14 items-center justify-center rounded-2xl text-xl font-semibold active:opacity-70"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
