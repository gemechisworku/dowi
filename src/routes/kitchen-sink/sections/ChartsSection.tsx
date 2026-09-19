import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Divider } from '@/components/ui/Divider'
import { BarChart } from '@/components/charts/BarChart'
import { GroupedBarChart } from '@/components/charts/GroupedBarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { Sparkline } from '@/components/charts/Sparkline'

const WEEKLY = [
  { label: 'W1', income: 9200, expense: 5400 },
  { label: 'W2', income: 11000, expense: 6200 },
  { label: 'W3', income: 8600, expense: 7100 },
  { label: 'W4', income: 13200, expense: 4900 },
]

const CATEGORY_BREAKDOWN = [
  { label: 'Food', value: 8240 },
  { label: 'Transport', value: 5100 },
  { label: 'Housing', value: 4800 },
  { label: 'Utilities', value: 3010 },
]

const DONUT = [
  { label: 'Food', value: 8240, color: 'var(--color-expense)' },
  { label: 'Transport', value: 5100, color: 'var(--blue-500)' },
  { label: 'Housing', value: 4800, color: 'var(--color-income)' },
  { label: 'Utilities', value: 3010, color: 'var(--color-warning)' },
]

export function ChartsSection() {
  return (
    <Card>
      <SectionHeader title="Charts" />

      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Income vs expense · by week
      </p>
      <GroupedBarChart title="Income vs expense by week" data={WEEKLY} />

      <Divider className="my-4" />

      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Expense by category · day report
      </p>
      <BarChart
        title="Expense by category"
        data={CATEGORY_BREAKDOWN}
        color="var(--color-expense)"
      />

      <Divider className="my-4" />

      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Where it went
      </p>
      <DonutChart title="Expense by category" data={DONUT} centerLabel="21,150" />

      <Divider className="my-4" />

      <div className="flex items-center gap-3">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Net trend
        </p>
        <Sparkline
          title="Net balance, last 8 weeks"
          values={[1200, 1800, 900, 2100, 1600, 2400, 2000, 2800]}
        />
      </div>
    </Card>
  )
}
