import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { normalizeTextSize } from './textSize'

/**
 * Applies Settings → Appearance's text size and density to the document
 * root as `data-*` attributes (src/styles/tokens.css reads them), the same
 * mechanism `ThemeProvider` uses for `data-theme` — except these read from
 * Dexie (via `useLiveQuery`) rather than localStorage, since — unlike
 * theme — there's no pre-mount flash to avoid: a font-size/padding change
 * one tick after mount isn't visually jarring the way a wrong theme is.
 *
 * Renders nothing; mounted once near the app root (inside DatabaseProvider,
 * so `useDatabase()` resolves) purely for this side effect.
 */
export function ApplyAppearance() {
  const { settingsRepo } = useDatabase()
  const settings = useLiveQuery(() => settingsRepo.get(), [settingsRepo])

  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', normalizeTextSize(settings?.textSize))
  }, [settings?.textSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-density', settings?.density ?? 'comfortable')
  }, [settings?.density])

  return null
}
