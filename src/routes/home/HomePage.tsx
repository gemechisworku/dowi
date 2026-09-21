import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Settings, Task } from '@/db/types'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import {
  getFinancialYearLabel,
  getFinancialYearRange,
  todayString,
  type Period,
} from '@/lib/period'
import { buildReport } from '../money/reports/aggregate'
import { getPeriodLabel } from '../money/reports/periodLabel'
import { buildRateLookup } from '../money/reports/rateLookup'
import { getOverdueCount, getTodayTasks, toggleCompletePatch } from '../tasks/taskViews'
import { getThisWeek } from '../tasks/week'
import { getRecentNotes } from '../notes/noteViews'
import { readHomePeriod, writeHomePeriod, type HomePeriod } from './homePrefs'
import { getBannerKind, isBannerDismissed, dismissBannerForToday } from './homeBanner'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { ListItem } from '@/components/ui/ListItem'
import { PeriodSelector } from '@/components/domain/PeriodSelector'
import { StatTile } from '@/components/domain/StatTile'
import { MoneyText } from '@/components/domain/MoneyText'
import { TaskCheckbox } from '@/components/domain/TaskCheckbox'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const HOME_PERIODS = ['week', 'month', 'year'] as const

const BANNER_COPY: Record<
  'plan' | 'review',
  { title: string; cta: string; href: string; icon: string }
> = {
  plan: { title: 'Plan your week', cta: 'Plan your week →', href: '/tasks/plan', icon: '🗓️' },
  review: {
    title: 'Review your week',
    cta: 'Review your week →',
    href: '/tasks/review',
    icon: '✅',
  },
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function noteSnippet(text: string, max = 90): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed
}

/**
 * The Home / landing screen (PRD §5.1): greeting, this period's money
 * headline, today's tasks, the weekly plan/review ritual, recent notes and
 * quick actions — everything a person needs to see "how am I doing and
 * what's next?" without tapping. Almost entirely composition over logic
 * M2–M7 already built (`buildReport`, `getTodayTasks`, note recency,
 * reminder-day config); the only new pure logic lives in `homePrefs.ts`
 * (period-toggle persistence) and `homeBanner.ts` (plan/review-day
 * detection + per-day dismissal).
 */
export function HomePage() {
  const { repos, settingsRepo } = useDatabase()
  const navigate = useNavigate()

  const settings = useLiveQuery(
    () => settingsRepo.get(),
    [settingsRepo],
    DEFAULT_SETTINGS,
  ) as Settings
  // Deliberately no EMPTY_ARRAY default here (unlike most other screens'
  // useLiveQuery calls) — `undefined` is what distinguishes "still loading"
  // from "loaded and genuinely empty", which is exactly what decides
  // whether this screen shows skeletons or the empty state (AC-H1).
  const transactions = useLiveQuery(() => repos.transactions.list(), [repos])
  const tasks = useLiveQuery(() => repos.tasks.list(), [repos])
  const notes = useLiveQuery(() => repos.notes.list(), [repos])
  const rates = useLiveQuery(() => repos.rates.list(), [repos], EMPTY_ARRAY)

  const [period, setPeriod] = useState<HomePeriod>(readHomePeriod)
  const today = todayString()
  const [dismissedToday, setDismissedToday] = useState(() => isBannerDismissed(today))

  // PeriodSelector is generically typed over the full `Period` union (it's
  // shared with Reports, which offers all four); restricting its `periods`
  // prop to HOME_PERIODS below guarantees at runtime this only ever
  // receives "week" | "month" | "year", which this narrows back to.
  function handlePeriodChange(next: Period) {
    const homePeriod = next as HomePeriod
    setPeriod(homePeriod)
    writeHomePeriod(homePeriod)
  }

  function handleDismissBanner() {
    dismissBannerForToday(today)
    setDismissedToday(true)
  }

  async function handleToggleComplete(task: Task, done: boolean) {
    await repos.tasks.update(task.id, toggleCompletePatch(done))
  }

  const { weekStartsOn, fyStartMonth, baseCurrency } = settings
  const getRate = useMemo(() => buildRateLookup(rates), [rates])

  const report = useMemo(
    () =>
      buildReport(transactions ?? EMPTY_ARRAY, period, today, {
        weekStartsOn,
        fyStartMonth,
        baseCurrency,
        getRate,
      }),
    [transactions, period, today, weekStartsOn, fyStartMonth, baseCurrency, getRate],
  )
  const periodLabel = getPeriodLabel(period, report, fyStartMonth)

  const todayTasksAll = useMemo(() => getTodayTasks(tasks ?? EMPTY_ARRAY, today), [tasks, today])
  const todayTasks = todayTasksAll.slice(0, 5)
  const overdueCount = useMemo(() => getOverdueCount(tasks ?? EMPTY_ARRAY, today), [tasks, today])

  const recentNotes = useMemo(() => getRecentNotes(notes ?? EMPTY_ARRAY, 3), [notes])

  const bannerKind = getBannerKind(settings.reminders, today)
  const showBanner = bannerKind !== null && !dismissedToday

  const now = new Date()
  const thisWeek = useMemo(() => getThisWeek(), [])
  const fyLabel = useMemo(() => {
    const range = getFinancialYearRange(today, fyStartMonth)
    return getFinancialYearLabel(range, fyStartMonth)
  }, [today, fyStartMonth])

  const isLoading = transactions === undefined || tasks === undefined || notes === undefined
  const hasNoData =
    !isLoading && transactions.length === 0 && tasks.length === 0 && notes.length === 0

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <header>
        <h1 className="text-xl font-bold tracking-tight">
          {greetingFor(now.getHours())} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {DATE_FORMATTER.format(now)} · Week {thisWeek.weekKey.split('-W')[1]} · {fyLabel}
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height={96} rounded="lg" />
          <Skeleton height={168} rounded="lg" />
          <Skeleton height={220} rounded="lg" />
          <Skeleton height={140} rounded="lg" />
        </div>
      ) : hasNoData ? (
        <Card>
          <EmptyState
            icon="👋"
            title="Welcome to Dowi"
            description="Money, tasks and notes — all local, all yours. Start with whichever you need first."
            action={
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/money/new?type=expense')}>
                  Log your first expense
                </Button>
                <Button variant="secondary" onClick={() => navigate('/tasks/new')}>
                  Add your first task
                </Button>
                <Button variant="secondary" onClick={() => navigate('/notes/new')}>
                  Write your first note
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {showBanner && bannerKind && (
            <Card
              className="flex items-center justify-between gap-3"
              style={{ background: 'var(--color-primary-soft)' }}
            >
              <button
                type="button"
                onClick={() => navigate(BANNER_COPY[bannerKind].href)}
                className="flex flex-1 items-center gap-2.5 text-left"
              >
                <span aria-hidden="true" className="text-xl">
                  {BANNER_COPY[bannerKind].icon}
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {BANNER_COPY[bannerKind].cta}
                </span>
              </button>
              <IconButton
                aria-label="Dismiss for today"
                icon="✕"
                variant="ghost"
                onClick={handleDismissBanner}
              />
            </Card>
          )}

          <Card>
            <SectionHeader
              title="Money"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/money')}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Reports ›
                </button>
              }
            />
            <PeriodSelector value={period} onChange={handlePeriodChange} periods={HOME_PERIODS} />
            <button
              type="button"
              onClick={() => navigate('/money')}
              className="mt-3 block w-full text-left"
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {periodLabel}
              </p>
              <div className="mt-1 flex gap-4">
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
                  value={
                    <MoneyText amountMinorUnits={report.netMinorUnits} currency={baseCurrency} />
                  }
                />
              </div>
              {(report.income.totalMinorUnits > 0 || report.expense.totalMinorUnits > 0) && (
                <div
                  className="mt-3 flex overflow-hidden"
                  style={{ height: 6, borderRadius: 'var(--radius-pill)' }}
                  role="img"
                  aria-label={`Income vs expense comparison for ${periodLabel}`}
                >
                  <div
                    style={{
                      flexGrow: Math.max(report.income.totalMinorUnits, 1),
                      background: 'var(--color-income)',
                    }}
                  />
                  <div
                    style={{
                      flexGrow: Math.max(report.expense.totalMinorUnits, 1),
                      background: 'var(--color-expense)',
                    }}
                  />
                </div>
              )}
            </button>
          </Card>

          <Card>
            <SectionHeader
              title="Today's tasks"
              action={
                <div className="flex items-center gap-2">
                  {overdueCount > 0 && <Badge tone="expense">{overdueCount} overdue</Badge>}
                  <button
                    type="button"
                    onClick={() => navigate('/tasks')}
                    className="text-xs font-semibold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Tasks ›
                  </button>
                </div>
              }
            />
            {todayTasks.length === 0 ? (
              <EmptyState icon="🎉" title="Nothing due today" />
            ) : (
              <div className="flex flex-col">
                {todayTasks.map((task) => (
                  // No row-level onClick here (unlike most ListItem usages)
                  // — the leading TaskCheckbox is itself a button, and
                  // nesting it inside a whole-row button is invalid HTML
                  // (axe's no-focusable-content rule catches it once real
                  // tasks are on screen to render). The title itself is the
                  // tap target for opening the task instead.
                  <ListItem
                    key={task.id}
                    leading={
                      <TaskCheckbox
                        checked={task.status === 'done'}
                        onChange={(checked) => void handleToggleComplete(task, checked)}
                        label={
                          task.status === 'done'
                            ? `Mark "${task.title}" not done`
                            : `Mark "${task.title}" done`
                        }
                      />
                    }
                    title={
                      <button
                        type="button"
                        onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                        className="text-left"
                      >
                        {task.title}
                      </button>
                    }
                  />
                ))}
                {todayTasksAll.length > 5 && (
                  <button
                    type="button"
                    onClick={() => navigate('/tasks')}
                    className="pt-1 text-left text-xs font-semibold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    +{todayTasksAll.length - 5} more today ›
                  </button>
                )}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeader
              title="Recent notes"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/notes')}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Notes ›
                </button>
              }
            />
            {recentNotes.length === 0 ? (
              <EmptyState icon="📝" title="No notes yet" />
            ) : (
              <div className="flex flex-col">
                {recentNotes.map((note) => (
                  <ListItem
                    key={note.id}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    title={note.title || 'Untitled'}
                    subtitle={note.contentText ? noteSnippet(note.contentText) : undefined}
                  />
                ))}
              </div>
            )}
          </Card>

          <div>
            <SectionHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => navigate('/money/new?type=income')}>
                + Income
              </Button>
              <Button variant="secondary" onClick={() => navigate('/money/new?type=expense')}>
                + Expense
              </Button>
              <Button variant="secondary" onClick={() => navigate('/notes/new')}>
                + Note
              </Button>
              <Button variant="secondary" onClick={() => navigate('/tasks/new')}>
                + Task
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
