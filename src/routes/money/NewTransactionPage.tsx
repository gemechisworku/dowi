import { useNavigate, useSearchParams } from 'react-router'
import type { TransactionType } from '@/db/types'
import { TransactionSheet } from './TransactionSheet'

/**
 * `/money/new[?type=income|expense]` — the standalone create-transaction
 * entry point for Home's quick actions and the PWA manifest shortcut
 * (`vite.config.ts`'s "Add expense" shortcut already pointed here before
 * this route existed). Chromeless per `AppLayout`'s routing table, same as
 * `/notes/new`. Mounts the exact `TransactionSheet` MoneyPage opens from its
 * own FAB — no parallel create flow — just pre-set from the `type` query
 * param and closing back to the transaction list instead of clearing local
 * `addOpen` state.
 */
export function NewTransactionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const type = searchParams.get('type')
  const initialType: TransactionType | undefined =
    type === 'income' ? 'income' : type === 'expense' ? 'expense' : undefined

  return (
    <TransactionSheet initialType={initialType} onClose={() => navigate('/money/transactions')} />
  )
}
