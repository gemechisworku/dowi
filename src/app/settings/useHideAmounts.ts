import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'

/**
 * Whether every amount in the app should render masked (Settings → Money →
 * "hide amounts", a privacy blur — PRD §5.8). `MoneyText` is the one place
 * every amount renders through, so this is the one place that reads the
 * setting; other cross-cutting settings (`baseCurrency`, `weekStartsOn`)
 * reach deep components the same way, via `useDatabase()` + `useLiveQuery`
 * rather than prop-drilling.
 */
export function useHideAmounts(): boolean {
  const { settingsRepo } = useDatabase()
  const settings = useLiveQuery(() => settingsRepo.get(), [settingsRepo])
  return settings?.hideAmounts ?? false
}
