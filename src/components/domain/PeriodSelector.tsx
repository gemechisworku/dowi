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
}

/** Day/Week/Month/FY switch used on Home and in Reports (PRD §5.1, §5.4). */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <SegmentedControl label="Report period" options={OPTIONS} value={value} onChange={onChange} />
  )
}
