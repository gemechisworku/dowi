import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { Period } from '@/lib/period'

export type { Period }

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'halfYear', label: '6 Months' },
  { value: 'year', label: 'Year' },
]

export interface PeriodSelectorProps {
  value: Period
  onChange: (value: Period) => void
  /** Restricts which periods are offered — Home's summary card omits "Day" (PRD §5.1), Reports offers all six. Defaults to all six. */
  periods?: readonly Period[]
  /** Forwarded to SegmentedControl — "inverse" for use on Home's gradient hero. */
  variant?: 'default' | 'inverse'
}

/** Day/Week/Month/Quarter/6-Months/FY switch used on Home and in Reports (PRD §5.1, §5.4). */
export function PeriodSelector({ value, onChange, periods, variant }: PeriodSelectorProps) {
  const options = periods ? OPTIONS.filter((o) => periods.includes(o.value)) : OPTIONS
  return (
    <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <SegmentedControl
        label="Report period"
        options={options}
        value={value}
        onChange={onChange}
        variant={variant}
      />
    </div>
  )
}
