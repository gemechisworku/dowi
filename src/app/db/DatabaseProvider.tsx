import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createDatabase } from '@/db/db'
import { createRepositories } from '@/db/repositories'
import { createSettingsRepo } from '@/db/settingsRepo'
import { createNotificationsRepo } from '@/db/notificationsRepo'
import { seedIfNeeded } from '@/db/seed'
import { requestPersistentStorage } from '@/db/storage'
import { DatabaseContext, type DatabaseContextValue } from './DatabaseContext'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'

/**
 * Opens the database once per app lifetime, seeds it if this is a first
 * run, and best-effort requests persistent storage (PRD D2) — then makes
 * everything available to the tree via context. Renders a small loading
 * state for the brief window before IndexedDB is ready, since every screen
 * downstream assumes the database is open.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<DatabaseContextValue | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Created once; DatabaseProvider is mounted exactly once at the app root.
  const db = useMemo(() => createDatabase(), [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await seedIfNeeded(db)
        void requestPersistentStorage()
        if (cancelled) return
        setValue({
          db,
          repos: createRepositories(db),
          settingsRepo: createSettingsRepo(db),
          notificationsRepo: createNotificationsRepo(db),
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [db])

  if (error) {
    return (
      <ErrorState
        title="Couldn't open the local database"
        description={error.message}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!value) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Opening database" size={28} />
      </div>
    )
  }

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}
