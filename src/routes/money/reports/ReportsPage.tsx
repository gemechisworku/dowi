import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { todayString, shiftPeriod, type Period } from '@/lib/period'
import { buildReport, buildCategoryTrend, isFuturePeriod, type BreakdownEntry } from './aggregate'
import { getPeriodLabel } from './periodLabel'
import { buildRateLookup } from './rateLookup'
import { transactionsToCsv, downloadCsv } from './csv'
import { buildShareSummary } from './summary'
import { CATEGORY_COLORS, MAX_CATEGORY_SLICES } from './chartColors'
import { formatIntervalLabel } from '@/lib/recurrence'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { MoneySubNav } from '../MoneySubNav'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Divider } from '@/components/ui/Divider'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PeriodSelector } from '@/components/domain/PeriodSelector'
import { PeriodStepper } from '@/components/domain/PeriodStepper'
import { StatTile } from '@/components/domain/StatTile'
import { MoneyText } from '@/components/domain/MoneyText'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { ListItem } from '@/components/ui/ListItem'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'
import { GroupedBarChart } from '@/components/charts/GroupedBarChart'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { LineChart } from '@/components/charts/LineChart'
import type { TransactionType } from '@/db/types'

/** How many trailing periods the category-trend chart compares — favors readability over cramming too many points onto one chart. */
const WINDOW_SIZE_BY_PERIOD: Record<Period, number> = {
  day: 7,
  week: 6,
  month: 6,
  quarter: 4,
  halfYear: 4,
  year: 3,
}

/**
 * The top N-1 categories get their own slice; everything past that is
 * folded into one "Other" slice — otherwise a period with many categories
 * would show a donut whose slices sum to less than the ranked list below
 * it, which is a "these numbers don't add up" bug waiting to be noticed.
 */
function buildDonutSlices(
  breakdown: BreakdownEntry[],
  categoryById: Map<string, { name: string }>,
) {
  const top = breakdown.slice(0, MAX_CATEGORY_SLICES - 1)
  const rest = breakdown.slice(MAX_CATEGORY_SLICES - 1)
  const slices = top.map((entry, i) => ({
    label: entry.key ? (categoryById.get(entry.key)?.name ?? 'Uncategorised') : 'Uncategorised',
    value: entry.amountMinorUnits,
    color: CATEGORY_COLORS[i]!,
  }))
  if (rest.length > 0) {
    slices.push({
      label: 'Other',
      value: rest.reduce((sum, e) => sum + e.amountMinorUnits, 0),
      color: 'var(--color-text-muted)',
    })
  }
  return slices
}

export function ReportsPage() {
  const { repos, settingsRepo } = useDatabase()
  const navigate = useNavigate()
  const { show: showSnackbar } = useSnackbar()
  const settings = useLiveQuery(() => settingsRepo.get(), [settingsRepo])
  const transactions = useLiveQuery(() => repos.transactions.list(), [repos], EMPTY_ARRAY)
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const sources = useLiveQuery(() => repos.sources.list(), [repos], EMPTY_ARRAY)
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)
  const rates = useLiveQuery(() => repos.rates.list(), [repos], EMPTY_ARRAY)
  const recurringTemplates = useLiveQuery(() => repos.recurring.list(), [repos], EMPTY_ARRAY)

  const [period, setPeriod] = useState<Period>('month')
  const [anchorDate, setAnchorDate] = useState(todayString())
  const [breakdownType, setBreakdownType] = useState<TransactionType>('expense')

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const recurringById = useMemo(
    () => new Map(recurringTemplates.map((r) => [r.id, r])),
    [recurringTemplates],
  )

  const weekStartsOn = settings?.weekStartsOn ?? 1
  const fyStartMonth = settings?.fyStartMonth ?? 1
  const baseCurrency = settings?.baseCurrency ?? 'ETB'

  const getRate = useMemo(() => buildRateLookup(rates), [rates])

  const report = useMemo(
    () =>
      buildReport(transactions, period, anchorDate, {
        weekStartsOn,
        fyStartMonth,
        baseCurrency,
        getRate,
      }),
    [transactions, period, anchorDate, weekStartsOn, fyStartMonth, baseCurrency, getRate],
  )

  const categoryTrend = useMemo(
    () =>
      buildCategoryTrend(
        transactions,
        period,
        anchorDate,
        breakdownType,
        WINDOW_SIZE_BY_PERIOD[period],
        { weekStartsOn, fyStartMonth, baseCurrency, getRate },
      ),
    [
      transactions,
      period,
      anchorDate,
      breakdownType,
      weekStartsOn,
      fyStartMonth,
      baseCurrency,
      getRate,
    ],
  )

  const label = getPeriodLabel(period, report, fyStartMonth)
  const nextDisabled = isFuturePeriod(period, shiftPeriod(period, anchorDate, 1), {
    weekStartsOn,
    fyStartMonth,
    baseCurrency,
    getRate,
  })

  const excludedTotal = Object.values(report.excludedCurrencies).reduce((a, b) => a + b, 0)
  const breakdown = report.categoryBreakdown[breakdownType]
  const breakdownTotal =
    breakdownType === 'income' ? report.income.totalMinorUnits : report.expense.totalMinorUnits

  function nameFor(map: Map<string, { name: string }>, key: string, fallback: string): string {
    return key ? (map.get(key)?.name ?? fallback) : fallback
  }

  function handleViewTransactions() {
    const params = new URLSearchParams({ from: report.range.start, to: report.range.end })
    navigate(`/money/transactions?${params}`)
  }

  function handleExportCsv() {
    const csv = transactionsToCsv(report.transactions, { categoryById, sourceById, accountById })
    downloadCsv(csv, `dowi-${period}-${report.range.start}.csv`)
  }

  async function handleShare() {
    const text = buildShareSummary(report, label, baseCurrency, categoryById)
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch (err) {
        // AbortError is the user dismissing the share sheet — not a failure.
        if (err instanceof Error && err.name !== 'AbortError') {
          showSnackbar({ message: 'Could not share the summary' })
        }
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showSnackbar({ message: 'Summary copied to clipboard' })
    } catch {
      showSnackbar({ message: 'Could not copy the summary' })
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeaderBand>
        <h1 className="text-2xl font-bold">Reports</h1>
        <MoneySubNav />
        <PeriodSelector value={period} onChange={setPeriod} variant="inverse" />
        <div data-header-control className="rounded-[var(--radius-md)] px-1">
          <PeriodStepper
            label={label}
            onPrevious={() => setAnchorDate((d) => shiftPeriod(period, d, -1))}
            onNext={() => setAnchorDate((d) => shiftPeriod(period, d, 1))}
            nextDisabled={nextDisabled}
          />
        </div>
      </PageHeaderBand>

      <div className="flex flex-col gap-4 px-4">

      <Card>
        <div className="flex gap-4">
          <StatTile
            label="Income"
            value={
              <MoneyText
                amountMinorUnits={report.income.totalMinorUnits}
                currency={baseCurrency}
                sign="income"
                approximate={report.income.wasConverted}
              />
            }
          />
          <StatTile
            label="Expense"
            value={
              <MoneyText
                amountMinorUnits={report.expense.totalMinorUnits}
                currency={baseCurrency}
                sign="expense"
                approximate={report.expense.wasConverted}
              />
            }
          />
          <StatTile
            label="Net"
            value={<MoneyText amountMinorUnits={report.netMinorUnits} currency={baseCurrency} />}
            delta={
              report.netDeltaPct === null
                ? '—'
                : `${report.netDeltaPct >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(report.netDeltaPct))}% vs last ${period}`
            }
          />
        </div>
        {excludedTotal > 0 && (
          <button
            type="button"
            onClick={() => navigate('/money/rates')}
            className="mt-3 block w-full text-left"
          >
            <Badge tone="warning">
              {excludedTotal} transaction{excludedTotal === 1 ? '' : 's'} in{' '}
              {Object.keys(report.excludedCurrencies).join(', ')} excluded — add a rate
            </Badge>
          </button>
        )}
      </Card>

      {report.recurringBreakdown.length > 0 && (
        <Card>
          <SectionHeader title="Recurring" />
          <p className="mb-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Not included in the totals above — shown separately since each repeats on its own
            schedule.
          </p>
          {report.recurringBreakdown.map((entry) => {
            const template = recurringById.get(entry.recurringId)
            const category = template ? categoryById.get(template.categoryId) : undefined
            return (
              <ListItem
                key={entry.recurringId}
                leading={<CategoryIcon icon={category?.icon ?? '🔁'} color={category?.color} />}
                title={template?.name ?? 'Deleted recurring item'}
                subtitle={
                  template
                    ? `${formatIntervalLabel(template.interval)}${entry.count > 1 ? ` · ${entry.count} occurrences this period` : ''}`
                    : `${entry.count} occurrence${entry.count === 1 ? '' : 's'} this period`
                }
                trailing={
                  <MoneyText
                    amountMinorUnits={entry.amountMinorUnits}
                    currency={baseCurrency}
                    sign={entry.type}
                    showSign
                  />
                }
              />
            )
          })}
        </Card>
      )}

      {period === 'day' ? (
        <Card>
          <SectionHeader title="Expense by category" />
          {report.subPeriods.length === 0 ? (
            <EmptyState icon="📊" title="No data for this period" />
          ) : (
            <BarChart
              title="Expense by category"
              data={report.subPeriods.map((b) => ({
                label: nameFor(categoryById, b.label, 'Other'),
                value: b.expenseMinorUnits,
              }))}
            />
          )}
        </Card>
      ) : (
        <>
          {period !== 'week' && (
            <Card>
              <SectionHeader title="Income vs expense" />
              {report.subPeriods.length === 0 ? (
                <EmptyState icon="📊" title="No data for this period" />
              ) : (
                <GroupedBarChart
                  title="Income vs expense"
                  data={report.subPeriods.map((b) => ({
                    label: b.label,
                    income: b.incomeMinorUnits,
                    expense: b.expenseMinorUnits,
                  }))}
                />
              )}
            </Card>
          )}
          <Card>
            <SectionHeader title="Expense trend" />
            {report.subPeriods.length === 0 ? (
              <EmptyState icon="📈" title="No data for this period" />
            ) : (
              <LineChart
                title="Expense trend"
                labels={report.subPeriods.map((b) => b.label)}
                series={[
                  {
                    label: 'Expense',
                    color: 'var(--color-expense)',
                    values: report.subPeriods.map((b) => b.expenseMinorUnits),
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}

      <Card>
        <SectionHeader
          title="Where it went"
          action={
            <div className="flex gap-1">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBreakdownType(t)}
                  aria-pressed={breakdownType === t}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                  style={{
                    background:
                      breakdownType === t ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: breakdownType === t ? 'var(--color-primary-fg)' : 'var(--color-text)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        />
        {breakdown.length === 0 ? (
          <EmptyState icon="🏷️" title={`No ${breakdownType} in this period`} />
        ) : (
          <DonutChart
            title={`${breakdownType} by category`}
            data={buildDonutSlices(breakdown, categoryById)}
          />
        )}
        <Divider className="my-3" />
        {breakdown.map((entry) => {
          const category = categoryById.get(entry.key)
          const pct =
            breakdownTotal > 0 ? Math.round((entry.amountMinorUnits / breakdownTotal) * 100) : 0
          return (
            <ListItem
              key={entry.key || 'uncategorised'}
              leading={<CategoryIcon icon={category?.icon ?? '📦'} color={category?.color} />}
              title={category?.name ?? 'Uncategorised'}
              subtitle={`${pct}% · ${entry.count} transaction${entry.count === 1 ? '' : 's'}`}
              trailing={
                <MoneyText amountMinorUnits={entry.amountMinorUnits} currency={baseCurrency} />
              }
            />
          )
        })}
      </Card>

      <Card>
        <SectionHeader
          title={`${breakdownType === 'income' ? 'Income' : 'Expense'} by category over time`}
        />
        {categoryTrend.series.every((s) => s.values.every((v) => v === 0)) ? (
          <EmptyState icon="📈" title={`No ${breakdownType} in this range`} />
        ) : (
          <LineChart
            title={`${breakdownType} by category over time`}
            labels={categoryTrend.periodLabels}
            series={categoryTrend.series.map((s, i) => ({
              label:
                s.categoryId === 'other'
                  ? 'Other'
                  : (categoryById.get(s.categoryId)?.name ?? 'Uncategorised'),
              color: s.categoryId === 'other' ? 'var(--color-text-muted)' : CATEGORY_COLORS[i]!,
              values: s.values,
            }))}
          />
        )}
      </Card>

      {report.sourceBreakdown.length > 0 && (
        <Card>
          <SectionHeader title="By source" />
          {report.sourceBreakdown.map((entry) => (
            <ListItem
              key={entry.key}
              title={nameFor(sourceById, entry.key, 'Unknown source')}
              subtitle={`${entry.count} transaction${entry.count === 1 ? '' : 's'}`}
              trailing={
                <MoneyText
                  amountMinorUnits={entry.amountMinorUnits}
                  currency={baseCurrency}
                  sign="income"
                />
              }
            />
          ))}
        </Card>
      )}

      {report.accountBreakdown.length > 0 && (
        <Card>
          <SectionHeader title="By account" />
          {report.accountBreakdown.map((entry) => (
            <ListItem
              key={entry.key}
              title={nameFor(accountById, entry.key, 'Unknown account')}
              subtitle={`${entry.count} transaction${entry.count === 1 ? '' : 's'}`}
              trailing={
                <MoneyText
                  amountMinorUnits={entry.amountMinorUnits}
                  currency={baseCurrency}
                  showSign
                />
              }
            />
          ))}
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="secondary" fullWidth onClick={handleViewTransactions}>
          View transactions
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={handleShare}>
            Share
          </Button>
          <Button variant="secondary" fullWidth onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>
      </div>
      </div>
    </div>
  )
}
