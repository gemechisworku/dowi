import { useTheme } from '@/app/theme/useTheme'
import type { ThemePreference } from '@/app/theme/ThemeContext'
import type { Settings } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const TEXT_SIZE_OPTIONS: { value: Settings['textSize']; label: string }[] = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
]

const DENSITY_OPTIONS: { value: Settings['density']; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

export interface AppearanceSettingsProps {
  settings: Settings
  onPatch: (patch: Partial<Settings>) => Promise<void>
}

/**
 * Settings → Appearance (PRD §5.8).
 *
 * Theme reconciliation: `ThemeProvider`/`useTheme()` (its own `dowi:theme`
 * localStorage key) stays the actual source of truth for what's rendered —
 * it's applied by an inline script in index.html before React even mounts,
 * specifically to avoid a flash of the wrong theme, and nothing here should
 * risk reintroducing that flash. So this control calls `setPreference()`
 * for the real effect, and separately mirrors the same value into
 * `Settings.theme` in Dexie purely so an exported backup carries the user's
 * theme choice with it (`exportAll`/`importAll` already round-trip the
 * whole `settings` row as-is). Restoring a backup on a *different* device
 * won't retroactively repaint that device before the user opens this
 * screen once — ThemeProvider never reads the DB — but the choice is there
 * waiting rather than silently lost, which is the part that actually
 * matters for a local-first backup.
 *
 * Text size and density have no such flash concern (a font-size/padding
 * change a tick after mount isn't jarring the way a wrong theme is), so
 * they're driven straight from Dexie via `ApplyAppearance`.
 */
export function AppearanceSettings({ settings, onPatch }: AppearanceSettingsProps) {
  const { preference, setPreference } = useTheme()

  async function handleThemeChange(next: ThemePreference) {
    setPreference(next)
    await onPatch({ theme: next })
  }

  return (
    <section>
      <SectionHeader title="Appearance" />
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px]" style={{ color: 'var(--color-text)' }}>
            Theme
          </span>
          <SegmentedControl
            label="Theme"
            options={THEME_OPTIONS}
            value={preference}
            onChange={handleThemeChange}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px]" style={{ color: 'var(--color-text)' }}>
            Text size
          </span>
          <SegmentedControl
            label="Text size"
            options={TEXT_SIZE_OPTIONS}
            value={settings.textSize}
            onChange={(value) => onPatch({ textSize: value })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px]" style={{ color: 'var(--color-text)' }}>
            Density
          </span>
          <SegmentedControl
            label="Density"
            options={DENSITY_OPTIONS}
            value={settings.density}
            onChange={(value) => onPatch({ density: value })}
          />
        </div>
      </Card>
    </section>
  )
}
