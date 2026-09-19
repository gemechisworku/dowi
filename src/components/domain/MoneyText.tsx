import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'

export interface MoneyTextProps {
  amountMinorUnits: number
  currency: string
  /** Colours the text green/red by income/expense sign; omit for a neutral amount. */
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

  return (
    <span
      className={cn('tabular-nums', className)}
      style={{ color, fontVariantNumeric: 'tabular-nums' }}
    >
      {formatMoney(amountMinorUnits, currency, { showSign, approximate })}
    </span>
  )
}
