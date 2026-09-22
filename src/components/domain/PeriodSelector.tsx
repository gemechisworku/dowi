import { SegmentedControl } from '@/components/ui/SegmentedControl'

export type Period = 'day' | 'week' | 'month' | 'year'

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

export interface PeriodSelectorProps {
  value: Period
  onChange: (value: Period) => void
  /** Restricts which periods are offered — Home's summary card omits "Day" (PRD §5.1), Reports offers all four. Defaults to all four. */
  periods?: readonly Period[]
  /** Forwarded to SegmentedControl — "inverse" for use on Home's gradient hero. */
  variant?: 'default' | 'inverse'
}

/** Day/Week/Month/FY switch used on Home and in Reports (PRD §5.1, §5.4). */
export function PeriodSelector({ value, onChange, periods, variant }: PeriodSelectorProps) {
  const options = periods ? OPTIONS.filter((o) => periods.includes(o.value)) : OPTIONS
  return (
    <SegmentedControl
      label="Report period"
      options={options}
      value={value}
      onChange={onChange}
      variant={variant}
    />
  )
}
