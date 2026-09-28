import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppUpdate } from '@/app/pwa/useAppUpdate'
import { useDatabase } from '@/app/db/useDatabase'
import { checkForServiceWorkerUpdate } from '@/app/serviceWorker/checkForUpdate'
import { getPushDebugLog, type PushDebugRecord } from '@/notifications/pushDebug'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSnackbar } from '@/components/ui/useSnackbar'

/**
 * The most recent CHANGELOG.md entry's heading line ("## 0.1.0 — initial
 * development"), read at build time via Vite's `?raw` import so this stays
 * in sync with the file instead of a hand-copied string. Falls back
 * gracefully if the file is ever missing/empty — this isn't a shipped
 * release yet, so that's a real possibility, not just defensive paranoia.
 */
function latestChangelogEntry(raw: string | undefined): string {
  const heading = raw
    ?.split('\n')
    .find((line) => line.startsWith('## '))
    ?.replace(/^##\s*/, '')
  return heading ?? 'Pre-release — no changelog entry yet'
}

const BUILD_DATE = new Date().toISOString().slice(0, 10)

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export interface AboutSettingsProps {
  changelog?: string
}

function PushDebugRow({ record }: { record: PushDebugRecord }) {
  return (
    <div
      className="flex flex-col gap-0.5 border-b py-2 text-xs last:border-b-0"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
          {timeAgo(record.ranAt)} ({record.source})
        </span>
        {record.error ? (
          <Badge tone="warning">Failed</Badge>
        ) : (
          <Badge tone={record.deliveredCount ? 'primary' : 'neutral'}>
            due {record.dueCount} · shown {record.deliveredCount}
          </Badge>
        )}
      </div>
      {record.error ? (
        <p style={{ color: 'var(--color-text-muted)' }}>{record.error}</p>
      ) : (
        <p style={{ color: 'var(--color-text-muted)' }}>
          permission: {record.permission} · {record.quiet ? 'quiet hours' : 'not quiet'}
        </p>
      )}
    </div>
  )
}

/** Settings → About (PRD §5.8): version, build date, changelog, update status, licences. */
export function AboutSettings({ changelog }: AboutSettingsProps) {
  const { show } = useSnackbar()
  const { db } = useDatabase()
  const [checking, setChecking] = useState(false)
  // Reads the same registration state UpdatePrompt.tsx's dialog is driven
  // by, via AppUpdateProvider — see AppUpdateContext.tsx for why this
  // can't just call useRegisterSW() again itself.
  const { needRefresh, updateApp } = useAppUpdate()
  // The one path with no console attached on a real phone — see
  // src/notifications/pushDebug.ts. Newest first; empty once loaded if a
  // background wake has genuinely never happened yet.
  const pushDebugLog = useLiveQuery(() => getPushDebugLog(db), [db])

  async function handleCheckForUpdate() {
    setChecking(true)
    try {
      const result = await checkForServiceWorkerUpdate()
      show({
        message:
          result === 'update-found'
            ? 'An update was found and will apply the next time you reload.'
            : result === 'up-to-date'
              ? "You're on the latest version."
              : "Update checks need a service worker, which this browser/context doesn't have.",
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <section>
      <SectionHeader title="About" />
      <Card className="flex flex-col gap-3">
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-muted)' }}>Version</dt>
            <dd className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {__APP_VERSION__}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt style={{ color: 'var(--color-text-muted)' }}>Build date</dt>
            <dd className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {BUILD_DATE}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt style={{ color: 'var(--color-text-muted)' }}>Latest change</dt>
            <dd className="text-right font-semibold" style={{ color: 'var(--color-text)' }}>
              {latestChangelogEntry(changelog)}
            </dd>
          </div>
        </dl>

        {needRefresh ? (
          <div className="flex items-center gap-2">
            <Badge tone="primary">Update available</Badge>
            <Button size="sm" onClick={updateApp}>
              Update app
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={checking}
            onClick={handleCheckForUpdate}
            className="self-start"
          >
            Check for update
          </Button>
        )}

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Dowi is built entirely on open-source software — React, Dexie, Tailwind, Tiptap and more —
          each under its own permissive licence (MIT/ISC/Apache-2.0). No proprietary or paid
          dependencies are used.
        </p>
      </Card>

      <Card className="mt-3 flex flex-col gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Background push (debug)
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Every time a push or periodic sync reaches the service worker while the app is closed —
          newest first. Empty means no background wake has reached this device at all, which points
          at delivery (OS/browser), not the app itself.
        </p>
        {pushDebugLog && pushDebugLog.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No background wake recorded yet.
          </p>
        )}
        {pushDebugLog && pushDebugLog.length > 0 && (
          <div className="flex max-h-64 flex-col overflow-y-auto">
            {pushDebugLog.map((record, i) => (
              <PushDebugRow key={`${record.ranAt}-${record.source}-${i}`} record={record} />
            ))}
          </div>
        )}
      </Card>
    </section>
  )
}
