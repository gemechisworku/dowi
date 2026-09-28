import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAppUpdate } from '@/app/pwa/useAppUpdate'
import { useDatabase } from '@/app/db/useDatabase'
import { checkForServiceWorkerUpdate } from '@/app/serviceWorker/checkForUpdate'
import { getLastPushDebug } from '@/notifications/pushDebug'
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
  // src/notifications/pushDebug.ts. `undefined` while loading, `null` once
  // loaded if a background wake has genuinely never happened yet.
  const lastPushDebug = useLiveQuery(() => getLastPushDebug(db), [db])

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
        {lastPushDebug === null && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No background wake recorded yet — this fills in the next time a push or periodic sync
            reaches the service worker while the app is closed.
          </p>
        )}
        {lastPushDebug && (
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: 'var(--color-text-muted)' }}>Last run</dt>
              <dd className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {timeAgo(lastPushDebug.ranAt)} ({lastPushDebug.source})
              </dd>
            </div>
            {lastPushDebug.error ? (
              <div className="flex flex-col gap-1">
                <Badge tone="warning" className="self-start">
                  Failed
                </Badge>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {lastPushDebug.error}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Reminders found due</dt>
                  <dd className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {lastPushDebug.dueCount}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Notifications shown</dt>
                  <dd className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {lastPushDebug.deliveredCount}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Permission / quiet hours</dt>
                  <dd className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    {lastPushDebug.permission} / {lastPushDebug.quiet ? 'quiet' : 'not quiet'}
                  </dd>
                </div>
              </>
            )}
          </dl>
        )}
      </Card>
    </section>
  )
}
