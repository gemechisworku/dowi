import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Dialog } from '@/components/ui/Dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ListItem } from '@/components/ui/ListItem'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { Divider } from '@/components/ui/Divider'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'

export function FeedbackSection() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const { show } = useSnackbar()

  return (
    <Card>
      <SectionHeader title="Sheets, dialogs & feedback" />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSheetOpen(true)}>Open sheet</Button>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          Delete something
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            show({
              message: 'Transaction deleted',
              action: { label: 'Undo', onClick: () => show({ message: 'Restored' }) },
            })
          }
        >
          Show undo snackbar
        </Button>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add expense">
        <Field label="Amount" required>
          {({ inputId }) => <Input id={inputId} inputMode="decimal" placeholder="0.00" autoFocus />}
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSheetOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setSheetOpen(false)}>Save</Button>
        </div>
      </Sheet>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="About Dowi"
        actions={<Button onClick={() => setDialogOpen(false)}>Close</Button>}
      >
        Everything you enter stays on this device — there is no account and no server.
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this category?"
        description="Transactions using it will be reassigned to Uncategorised."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          show({ message: 'Category deleted' })
        }}
      />

      <Divider className="my-4" />

      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Swipe to delete
      </p>
      {deleted ? (
        <EmptyState icon="🗑️" title="Nothing left here" description="You deleted the only row." />
      ) : (
        <SwipeableRow onSwipeLeft={() => setDeleted(true)}>
          <ListItem
            leading={<CategoryIcon icon="🍽️" />}
            title="Lunch with the team"
            subtitle="Food · today"
            trailing={<span style={{ color: 'var(--color-expense)' }}>−320</span>}
          />
        </SwipeableRow>
      )}
      {deleted && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setDeleted(false)}>
          Reset demo
        </Button>
      )}

      <Divider className="my-4" />

      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Pull to refresh (drag down from the top of this box)
      </p>
      <div
        className="max-h-40 overflow-y-auto rounded-[var(--radius-md)]"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <PullToRefresh
          onRefresh={() =>
            new Promise((r) => setTimeout(r, 800)).then(() => setRefreshCount((c) => c + 1))
          }
        >
          <div className="p-3 text-sm">Refreshed {refreshCount} time(s).</div>
        </PullToRefresh>
      </div>

      <Divider className="my-4" />
      <ErrorState onRetry={() => show({ message: 'Retried' })} />
    </Card>
  )
}
