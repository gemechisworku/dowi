import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import {
  exportAll,
  importAll,
  validateBackup,
  BackupValidationError,
  type BackupData,
  type ImportMode,
} from '@/db/backup'
import { computeImportPreview, totalImportRows, type ImportPreviewRow } from './importPreview'
import { getStorageUsage, requestPersistentStorage, type StorageUsage } from '@/db/storage'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TypeToConfirmDialog } from '@/components/ui/TypeToConfirmDialog'
import { useSnackbar } from '@/components/ui/useSnackbar'

const ERASE_PHRASE = 'ERASE'

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'unknown'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Settings → Data (PRD §5.8): export/import (with a preview before
 * confirming, AC-S2/AC-S3), storage usage, persistent-storage request, a
 * link into Trash, and erase-all behind a typed confirmation.
 *
 * Reuses `exportAll`/`importAll`/`validateBackup` (src/db/backup.ts) — the
 * same functions `/debug/data` (M2) already exercised — rather than
 * reimplementing any of this; the only new piece is the preview, computed
 * purely from the parsed file (`computeImportPreview`), which is a UI-layer
 * read, not a new backend function.
 */
export function DataSettings() {
  const { db, repos } = useDatabase()
  const { show } = useSnackbar()
  const trashedNotes = useLiveQuery(() => repos.notes.listTrashed(), [repos], EMPTY_ARRAY)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [busy, setBusy] = useState(false)

  const [pendingImport, setPendingImport] = useState<BackupData | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
  const [confirmErase, setConfirmErase] = useState(false)

  async function refreshUsage() {
    setUsage(await getStorageUsage())
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

  async function handleFileSelected(file: File) {
    setBusy(true)
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      validateBackup(parsed)
      setPreviewRows(computeImportPreview(parsed))
      setImportMode('merge')
      setPendingImport(parsed)
    } catch (err) {
      const message =
        err instanceof BackupValidationError
          ? err.message
          : 'Import failed — that file was not a valid Dowi backup. Nothing was changed.'
      show({ message })
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return
    setBusy(true)
    try {
      const result = await importAll(db, pendingImport, importMode)
      const total = totalImportRows(previewRows)
      show({
        message: `Imported ${total} record${total === 1 ? '' : 's'} (${result.mode === 'replace' ? 'replaced everything' : 'merged'})`,
      })
      setPendingImport(null)
      await refreshUsage()
    } catch {
      show({ message: 'Import failed partway through — nothing was changed.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestPersistent() {
    const granted = await requestPersistentStorage()
    show({ message: granted ? 'Persistent storage granted' : "Couldn't grant persistent storage" })
    await refreshUsage()
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
    await refreshUsage()
  }

  return (
    <section>
      <SectionHeader title="Data" />
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Export everything to a single .json file, or restore from one.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleExport}>
              Export backup
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Import backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileSelected(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        <Link
          to="/notes/trash"
          className="-mx-1 flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] px-1"
        >
          <span className="text-[15px]" style={{ color: 'var(--color-text)' }}>
            Trash
          </span>
          <span
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {trashedNotes.length === 0 ? 'Empty' : `${trashedNotes.length} deleted note(s)`}
            <span aria-hidden="true">›</span>
          </span>
        </Link>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-bold" style={{ color: 'var(--color-text)' }}>
              Storage
            </p>
            <Button size="sm" variant="ghost" onClick={refreshUsage}>
              Check
            </Button>
          </div>
          {usage ? (
            <ul className="flex flex-col gap-1 text-sm" style={{ color: 'var(--color-text)' }}>
              <li>Used: {formatBytes(usage.usageBytes)}</li>
              <li>Quota: {formatBytes(usage.quotaBytes)}</li>
              <li>
                Persisted: {usage.persisted === null ? 'unknown' : usage.persisted ? 'Yes' : 'No'}
              </li>
            </ul>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Tap "Check" to read current usage.
            </p>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRequestPersistent}
            className="self-start"
          >
            Request persistent storage
          </Button>
        </div>

        <div
          className="flex flex-col gap-2 border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
            Danger zone
          </p>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setConfirmErase(true)}
            className="self-start"
          >
            Erase all data
          </Button>
        </div>
      </Card>

      <Dialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Review this import"
        actions={
          <>
            <Button variant="secondary" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={handleConfirmImport}>
              {importMode === 'replace' ? 'Replace everything' : 'Merge in'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <SegmentedControl
            label="Import mode"
            value={importMode}
            onChange={setImportMode}
            options={[
              { value: 'merge', label: 'Merge' },
              { value: 'replace', label: 'Replace' },
            ]}
          />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {importMode === 'replace'
              ? 'Every existing record is deleted first, then replaced with the file below.'
              : 'Records from the file are added or overwritten by id; anything not in the file is left as-is.'}
          </p>
          <ul className="flex flex-col gap-1 text-sm" style={{ color: 'var(--color-text)' }}>
            {previewRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between">
                <span>{row.label}</span>
                <span className="font-semibold tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {totalImportRows(previewRows)} records total
          </p>
        </div>
      </Dialog>

      <TypeToConfirmDialog
        open={confirmErase}
        title="Erase all data?"
        description="This permanently deletes every transaction, note, task, category and setting on this device. Export a backup first if you might want any of it back."
        confirmPhrase={ERASE_PHRASE}
        confirmLabel="Erase everything"
        onCancel={() => setConfirmErase(false)}
        onConfirm={handleEraseAll}
      />
    </section>
  )
}
