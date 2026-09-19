import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { exportAll, importAll, validateBackup, BackupValidationError } from '@/db/backup'
import { getStorageUsage, type StorageUsage } from '@/db/storage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ListItem } from '@/components/ui/ListItem'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/useSnackbar'

/**
 * Not a real app screen — a temporary panel for exercising the M2 data
 * layer end to end (persistence, export/import, storage usage) before M9
 * builds the real Settings → Data UI. See docs/TESTING.md §M2.
 */
export function DataDebugPage() {
  const { repos, db } = useDatabase()
  const { show } = useSnackbar()
  // Reactive: updates automatically after any create/import/erase below,
  // no manual refresh() needed — this is the useLiveQuery pattern PRD D5
  // calls for everywhere data is read.
  const categories = useLiveQuery(() => repos.categories.list(), [repos]) ?? []
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [confirmErase, setConfirmErase] = useState(false)
  const [busy, setBusy] = useState(false)

  // navigator.storage isn't a Dexie table, so there's nothing to subscribe
  // to — this is a genuine one-off read, refreshed explicitly after each
  // action below rather than on a mount effect.
  async function loadUsage() {
    setUsage(await getStorageUsage())
  }

  async function handleAddTestCategory() {
    await repos.categories.create({
      name: `Test category ${new Date().toLocaleTimeString()}`,
      icon: '🧪',
      color: 'var(--blue-500)',
      type: 'expense',
    })
    await loadUsage()
  }

  async function handleExport() {
    const data = await exportAll(db)
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dowi-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    show({ message: 'Backup exported' })
  }

  async function handleImportFile(file: File) {
    setBusy(true)
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      validateBackup(parsed)
      const result = await importAll(db, parsed, 'replace')
      show({ message: `Imported ${result.counts.categories} categories and more` })
      await loadUsage()
    } catch (err) {
      const message =
        err instanceof BackupValidationError
          ? err.message
          : 'Import failed — file was not a valid backup.'
      show({ message })
    } finally {
      setBusy(false)
    }
  }

  async function handleEraseAll() {
    setConfirmErase(false)
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.sources.clear(),
      db.accounts.clear(),
      db.rates.clear(),
      db.notes.clear(),
      db.noteCollections.clear(),
      db.tasks.clear(),
      db.taskCollections.clear(),
      db.notifications.clear(),
      db.settings.clear(),
      db.meta.clear(),
    ])
    show({ message: 'All data erased' })
    await loadUsage()
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Data layer debug</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Temporary panel for M2 — a real Settings → Data screen ships in M9.
        </p>
      </div>

      <Card>
        <SectionHeader title={`Categories (${categories.length})`} />
        <Button size="sm" variant="secondary" onClick={handleAddTestCategory}>
          Add a test category
        </Button>
        <div className="mt-3">
          {categories.map((c) => (
            <ListItem
              key={c.id}
              leading={<CategoryIcon icon={c.icon} color={c.color} />}
              title={c.name}
              subtitle={c.type}
            />
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Backup" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleExport}>
            Export JSON
          </Button>
          <label className="inline-flex">
            <span
              className="inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-pill)] px-4 text-[13px] font-semibold"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            >
              {busy ? 'Importing…' : 'Import JSON'}
            </span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
          </label>
          <Button size="sm" variant="danger" onClick={() => setConfirmErase(true)}>
            Erase all
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Storage"
          action={
            <Button size="sm" variant="ghost" onClick={loadUsage}>
              Check
            </Button>
          }
        />
        {usage ? (
          <ul className="space-y-1 text-sm">
            <li>
              Used:{' '}
              {usage.usageBytes !== null ? `${(usage.usageBytes / 1024).toFixed(1)} KB` : 'unknown'}
            </li>
            <li>
              Quota:{' '}
              {usage.quotaBytes !== null
                ? `${(usage.quotaBytes / 1024 / 1024).toFixed(1)} MB`
                : 'unknown'}
            </li>
            <li>
              Persisted: {usage.persisted === null ? 'unknown' : usage.persisted ? 'yes' : 'no'}
            </li>
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Tap "Check" to read the current usage.
          </p>
        )}
      </Card>

      <ConfirmDialog
        open={confirmErase}
        title="Erase all data?"
        description="This deletes every transaction, note, task and setting on this device. This cannot be undone."
        confirmLabel="Erase everything"
        danger
        onCancel={() => setConfirmErase(false)}
        onConfirm={handleEraseAll}
      />
    </div>
  )
}
