import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Divider } from '@/components/ui/Divider'
import { ListItem } from '@/components/ui/ListItem'
import { MoneyText } from '@/components/domain/MoneyText'
import { AmountKeypad } from '@/components/domain/AmountKeypad'
import { PeriodSelector, type Period } from '@/components/domain/PeriodSelector'
import { PeriodStepper } from '@/components/domain/PeriodStepper'
import { StatTile } from '@/components/domain/StatTile'
import { ProgressBar } from '@/components/domain/ProgressBar'
import { TaskCheckbox } from '@/components/domain/TaskCheckbox'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { CollectionChip } from '@/components/domain/CollectionChip'

export function DomainSection() {
  const [keypadValue, setKeypadValue] = useState('124.50')
  const [period, setPeriod] = useState<Period>('month')
  const [monthIndex, setMonthIndex] = useState(8) // September
  const [taskDone, setTaskDone] = useState(false)
  const [collection, setCollection] = useState('work')

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  return (
    <Card>
      <SectionHeader title="Money & task building blocks" />

      <div className="flex items-baseline gap-4">
        <MoneyText amountMinorUnits={1842000} currency="ETB" />
        <MoneyText amountMinorUnits={4200000} currency="ETB" sign="income" showSign />
        <MoneyText amountMinorUnits={-235000} currency="ETB" sign="expense" showSign />
        <MoneyText amountMinorUnits={168000} currency="USD" approximate />
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Zero-decimal (JPY) and three-decimal (KWD) currencies:{' '}
        <MoneyText amountMinorUnits={1235} currency="JPY" /> ·{' '}
        <MoneyText amountMinorUnits={1234} currency="KWD" />
      </p>

      <Divider className="my-4" />

      <div className="flex flex-wrap items-start gap-6">
        <AmountKeypad value={keypadValue} onChange={setKeypadValue} className="w-56" />
        <div className="pt-2 text-2xl font-bold">
          <MoneyText
            amountMinorUnits={Math.round(parseFloat(keypadValue || '0') * 100)}
            currency="ETB"
          />
        </div>
      </div>

      <Divider className="my-4" />

      <PeriodSelector value={period} onChange={setPeriod} />
      <div className="mt-3">
        <PeriodStepper
          label={`${months[monthIndex]} 2026`}
          onPrevious={() => setMonthIndex((i) => Math.max(0, i - 1))}
          onNext={() => setMonthIndex((i) => Math.min(11, i + 1))}
          nextDisabled={monthIndex === 8}
        />
      </div>

      <Divider className="my-4" />

      <div className="flex gap-4">
        <StatTile
          label="Income"
          value={<MoneyText amountMinorUnits={4200000} currency="ETB" sign="income" />}
        />
        <StatTile
          label="Expense"
          value={<MoneyText amountMinorUnits={2358000} currency="ETB" sign="expense" />}
        />
        <StatTile
          label="Net"
          value={<MoneyText amountMinorUnits={1842000} currency="ETB" />}
          delta="▲ 12% vs last month"
        />
      </div>

      <Divider className="my-4" />

      <div className="space-y-2">
        <ProgressBar value={0.67} tone="primary" label="Weekly task completion" />
        <ProgressBar value={0.35} tone="expense" label="Budget used" />
        <ProgressBar value={0.9} tone="income" label="Savings goal progress" />
      </div>

      <Divider className="my-4" />

      <ListItem
        leading={
          <TaskCheckbox checked={taskDone} onChange={setTaskDone} label="Weekly review write-up" />
        }
        title="Weekly review write-up"
        subtitle={taskDone ? 'Completed' : 'Due today · 18:00'}
      />
      <ListItem
        leading={<CategoryIcon icon="🍽️" />}
        title="Food"
        subtitle="42 transactions this month"
      />
      <ListItem
        leading={<CategoryIcon icon="🚕" color="var(--color-warning)" />}
        title="Transport"
        subtitle="18 transactions this month"
      />

      <Divider className="my-4" />

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'work', name: 'Work' },
          { id: 'personal', name: 'Personal' },
          { id: 'reviews', name: 'Weekly reviews' },
        ].map((c) => (
          <CollectionChip
            key={c.id}
            name={c.name}
            selected={collection === c.id}
            onClick={() => setCollection(c.id)}
          />
        ))}
      </div>
    </Card>
  )
}
