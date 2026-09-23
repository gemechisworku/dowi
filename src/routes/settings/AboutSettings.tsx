import { useState } from 'react'
import { useAppUpdate } from '@/app/pwa/useAppUpdate'
import { checkForServiceWorkerUpdate } from '@/app/serviceWorker/checkForUpdate'
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

export interface AboutSettingsProps {
  changelog?: string
}

/** Settings → About (PRD §5.8): version, build date, changelog, update status, licences. */
export function AboutSettings({ changelog }: AboutSettingsProps) {
  const { show } = useSnackbar()
  const [checking, setChecking] = useState(false)
  // Reads the same registration state UpdatePrompt.tsx's dialog is driven
  // by, via AppUpdateProvider — see AppUpdateContext.tsx for why this
  // can't just call useRegisterSW() again itself.
  const { needRefresh, updateApp } = useAppUpdate()

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
    </section>
  )
}
