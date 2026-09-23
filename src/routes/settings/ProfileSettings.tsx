import type { Settings } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'

export interface ProfileSettingsProps {
  settings: Settings
  onPatch: (patch: Partial<Settings>) => Promise<void>
}

/**
 * Settings → Profile — the only place `displayName` is set once the
 * first-run Home prompt (see profilePromptDismissal.ts) has been skipped or
 * dismissed. Purely cosmetic (personalizes greetings/reminder copy); never
 * required, so there's no validation beyond a length cap.
 */
export function ProfileSettings({ settings, onPatch }: ProfileSettingsProps) {
  return (
    <section>
      <SectionHeader title="Profile" />
      <Card className="flex flex-col gap-3">
        <Field label="Your name">
          {({ inputId }) => (
            <Input
              id={inputId}
              value={settings.displayName ?? ''}
              onChange={(e) => {
                // Don't trim on every keystroke — that would strip a
                // trailing space the instant it's typed, making it
                // impossible to type a second word of a name.
                const value = e.target.value
                onPatch({ displayName: value.trim().length > 0 ? value : undefined })
              }}
              placeholder="Not set"
              maxLength={40}
            />
          )}
        </Field>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Used to personalize greetings and reminders. Never leaves this device except baked into
          the text of a reminder itself.
        </p>
      </Card>
    </section>
  )
}
