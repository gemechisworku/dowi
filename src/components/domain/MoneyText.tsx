import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'

export interface MoneyTextProps {
  /**
   * Always the magnitude — transactions store income/expense amounts as
   * non-negative integers and use `type`/`sign` for the semantics, never a
   * negative amountMinorUnits. Passing an already-signed value also works
   * (its magnitude is taken), so a precomputed net figure can be passed
   * straight through.
   */
  amountMinorUnits: number
  currency: string
  /**
   * Colours the text green/red by income/expense, and — together with
   * `showSign` — forces the +/− prefix to match that semantic sign rather
   * than amountMinorUnits' own (since that's usually non-negative even for
   * an expense). Use "neutral" for an already-signed value like a net
   * total, where the natural numeric sign should decide the prefix instead.
   */
  sign?: 'income' | 'expense' | 'neutral'
  showSign?: boolean
  approximate?: boolean
  className?: string
}

/** The one place amounts are formatted for display — every screen renders money through this. */
export function MoneyText({
  amountMinorUnits,
  currency,
  sign = 'neutral',
  showSign = false,
  approximate = false,
  className,
}: MoneyTextProps) {
  const color =
    sign === 'income'
      ? 'var(--color-income)'
      : sign === 'expense'
        ? 'var(--color-expense)'
        : 'var(--color-text)'

  const displayAmount =
    sign === 'expense'
      ? -Math.abs(amountMinorUnits)
      : sign === 'income'
        ? Math.abs(amountMinorUnits)
        : amountMinorUnits

  return (
    <span
      className={cn('tabular-nums', className)}
      style={{ color, fontVariantNumeric: 'tabular-nums' }}
    >
      {formatMoney(displayAmount, currency, { showSign, approximate })}
    </span>
  )
}
