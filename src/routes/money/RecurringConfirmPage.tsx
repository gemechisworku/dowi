import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { RecurringTransaction } from '@/db/types'
import { TransactionSheet } from './TransactionSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; template: RecurringTransaction }
  | { status: 'not-found' }

/**
 * `/money/recurring/confirm?id=&due=` — reached by tapping a `recurring-due`
 * notification (a remind-and-confirm template's deep link, built in
 * `src/lib/recurrence.ts`'s computeDueRecurring). Chromeless per
 * `AppLayout`, same treatment as `/money/new`. Loads the template and
 * mounts the exact `TransactionSheet` RecurringPage/MoneyPage open from
 * their own FABs, pre-filled from the template via its `recurringTemplate`
 * prop — no parallel confirm UI.
 *
 * A plain one-time fetch rather than `useLiveQuery`, same reasoning as
 * `NoteEditorPage`'s single-record load: `useLiveQuery` on a `get(id)`
 * can't distinguish "still loading" from "resolved to undefined" (both
 * render as `undefined`), which would leave a deleted/unknown template
 * stuck on the loading spinner forever instead of reaching the not-found
 * state.
 */
export function RecurringConfirmPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { repos } = useDatabase()
  const id = searchParams.get('id') ?? ''
  const due = searchParams.get('due') ?? undefined

  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    repos.recurring.get(id).then((found) => {
      if (cancelled) return
      setState(
        !found || found.deletedAt ? { status: 'not-found' } : { status: 'found', template: found },
      )
    })
    return () => {
      cancelled = true
    }
  }, [repos, id])

  if (state.status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner label="Loading recurring item" size={28} />
      </div>
    )
  }

  if (state.status === 'not-found') {
    return (
      <div className="px-4 pt-2">
        <EmptyState
          icon="🔁"
          title="Recurring item not found"
          description="It may have been deleted since this reminder was sent."
        />
      </div>
    )
  }

  return (
    <TransactionSheet
      recurringTemplate={state.template}
      recurringDueDate={due}
      onClose={() => navigate('/money/transactions')}
    />
  )
}
