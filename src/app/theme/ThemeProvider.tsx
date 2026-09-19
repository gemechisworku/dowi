import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemePreference } from './ThemeContext'

const STORAGE_KEY = 'dowi:theme'

function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back silently
  }
  return 'system'
}

function applyToDocument(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref)
  }
}

/**
 * The pre-hydration flash for an *explicit* light/dark choice is prevented
 * by the inline script in index.html, kept in sync with STORAGE_KEY above.
 * This provider is the source of truth once React has mounted.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = readStoredPreference()
    applyToDocument(stored)
    return stored
  })

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref)
    applyToDocument(pref)
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      // ignore persistence failures
    }
  }, [])

  useEffect(() => {
    applyToDocument(preference)
  }, [preference])

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
