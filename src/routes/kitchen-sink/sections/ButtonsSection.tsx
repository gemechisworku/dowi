import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Divider } from '@/components/ui/Divider'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Card } from '@/components/ui/Card'

export function ButtonsSection() {
  const [loading, setLoading] = useState(false)

  return (
    <Card>
      <SectionHeader title="Buttons & basics" />

      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
        <Button
          loading={loading}
          onClick={() => {
            setLoading(true)
            setTimeout(() => setLoading(false), 1500)
          }}
        >
          {loading ? 'Saving…' : 'Tap to load'}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>

      <Divider className="my-4" />

      <div className="flex flex-wrap items-center gap-3">
        <IconButton aria-label="Notifications" icon="🔔" badge />
        <IconButton aria-label="Back" icon="‹" />
        <IconButton aria-label="Ghost action" icon="⚙️" variant="ghost" />
        <Avatar name="Gemechis Worku" />
        <Avatar name="Ada Lovelace" />
        <Badge tone="primary">Primary</Badge>
        <Badge tone="income">Income</Badge>
        <Badge tone="expense">Expense</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="neutral">Neutral</Badge>
        <Spinner label="Loading section" />
      </div>

      <Divider className="my-4" />

      <div className="space-y-2">
        <Skeleton height={14} width="70%" />
        <Skeleton height={14} width="90%" />
        <Skeleton height={40} rounded="md" />
      </div>
    </Card>
  )
}
