import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'

export interface HomeProfilePromptProps {
  onSave: (name: string) => void
  onSkip: () => void
}

/** Soft, dismissible first-run prompt — see profilePromptDismissal.ts for the persistence half. */
export function HomeProfilePrompt({ onSave, onSkip }: HomeProfilePromptProps) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  function handleSave() {
    if (trimmed) onSave(trimmed)
  }

  return (
    <Card className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">What should we call you?</p>
        <p className="mb-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Personalizes your greeting and reminders — you can set this later in Settings too.
        </p>
        <div className="flex gap-2">
          <Input
            aria-label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
          />
          <Button size="sm" onClick={handleSave} disabled={!trimmed}>
            Save
          </Button>
        </div>
      </div>
      {/* Not "Skip for now" — the getting-started tour's own "Skip" button
          (also possibly on screen at once, on an empty database) would
          otherwise substring-match the same accessible name in tests and
          screen readers alike. */}
      <IconButton aria-label="Dismiss profile prompt" icon="✕" variant="ghost" onClick={onSkip} />
    </Card>
  )
}
