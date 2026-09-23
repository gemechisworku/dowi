import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Settings, Task } from '@/db/types'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'
import { SEEDED_META_KEY } from '@/db/seed'
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
import { getUsageWeekNumber } from './usageWeek'
import { readHomePeriod, writeHomePeriod, type HomePeriod } from './homePrefs'
import { getBannerKind, isBannerDismissed, dismissBannerForToday } from './homeBanner'
import { isTourDismissed, dismissTour } from './homeTour'
import { GettingStartedTour } from './GettingStartedTour'
import { isProfilePromptDismissed, dismissProfilePrompt } from './profilePromptDismissal'
import { HomeProfilePrompt } from './HomeProfilePrompt'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { ListItem } from '@/components/ui/ListItem'
import { PeriodSelector } from '@/components/domain/PeriodSelector'
import { MoneyText } from '@/components/domain/MoneyText'
import { TaskCheckbox } from '@/components/domain/TaskCheckbox'
import { CategoryIcon } from '@/components/domain/CategoryIcon'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const HOME_PERIODS = ['week', 'month', 'year'] as const

const BANNER_COPY: Record<'plan' | 'review', { title: string; href: string; icon: string }> = {
  plan: { title: 'Plan your week', href: '/tasks/plan', icon: '🗓️' },
  review: { title: 'Review your week', href: '/tasks/review', icon: '✅' },
}

/** Order and copy match the chosen Option A ("Soft Cards") design (design/design-options.html). */
const QUICK_ACTIONS = [
  { icon: '💸', label: 'Expense', href: '/money/new?type=expense' },
  { icon: '💰', label: 'Income', href: '/money/new?type=income' },
  { icon: '📝', label: 'Note', href: '/notes/new' },
  { icon: '✅', label: 'Task', href: '/tasks/new' },
] as const

function greetingFor(hour: number, displayName?: string): string {
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return displayName ? `${greeting}, ${displayName}` : greeting
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
  const { db, repos, settingsRepo } = useDatabase()
  const navigate = useNavigate()
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(isProfilePromptDismissed)

  const settings = useLiveQuery(
    () => settingsRepo.get(),
    [settingsRepo],
    DEFAULT_SETTINGS,
  ) as Settings
  const installedAtMeta = useLiveQuery(() => db.meta.get(SEEDED_META_KEY), [db])
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
  const [tourDismissed, setTourDismissed] = useState(isTourDismissed)
  const [tourOpen, setTourOpen] = useState(false)

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

  function handleDismissTour() {
    dismissTour()
    setTourDismissed(true)
  }

  async function handleSaveDisplayName(name: string) {
    await settingsRepo.update({ displayName: name })
    dismissProfilePrompt()
    setProfilePromptDismissed(true)
  }

  function handleSkipProfilePrompt() {
    dismissProfilePrompt()
    setProfilePromptDismissed(true)
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
  const weekTasks = useMemo(
    () => (tasks ?? EMPTY_ARRAY).filter((t) => t.weekKey === getThisWeek().weekKey),
    [tasks],
  )
  const weekDoneCount = weekTasks.filter((t) => t.status === 'done').length

  // Each bar's width is relative to whichever of income/expense is larger, so
  // the pair always reads as a comparison rather than two unrelated gauges —
  // Option A's mockup shows this for the income > expense case; this
  // generalises it to the reverse case too.
  const barMax = Math.max(report.income.totalMinorUnits, report.expense.totalMinorUnits, 1)
  const incomeBarPct = (report.income.totalMinorUnits / barMax) * 100
  const expenseBarPct = (report.expense.totalMinorUnits / barMax) * 100

  const now = new Date()
  const usageWeek = getUsageWeekNumber(installedAtMeta?.value, now)
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
          {greetingFor(now.getHours(), settings.displayName)} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {DATE_FORMATTER.format(now)} · Week {usageWeek} · {fyLabel}
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height={210} rounded="lg" />
          <Skeleton height={72} rounded="lg" />
          <Skeleton height={220} rounded="lg" />
          <Skeleton height={140} rounded="lg" />
        </div>
      ) : (
        <>
          {!settings.displayName && !profilePromptDismissed && (
            <HomeProfilePrompt onSave={handleSaveDisplayName} onSkip={handleSkipProfilePrompt} />
          )}

          {/* Brief entry point into the guided tour — shown only while there's
              no data at all yet, never as a replacement for the real dashboard
              below (which already renders correctly at all-zero values). */}
          {hasNoData && !tourDismissed && (
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">New here?</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Take a 1-minute tour of Money, Tasks and Notes.
                </p>
              </div>
              <Button size="sm" onClick={() => setTourOpen(true)}>
                Take the tour
              </Button>
              <IconButton
                aria-label="Dismiss getting-started tips"
                icon="✕"
                variant="ghost"
                onClick={handleDismissTour}
              />
            </Card>
          )}

          {/* Hero (Option A "Soft Cards" — design/design-options.html): a single
              blue-gradient card carries the headline net figure. The toggle sits
              outside the tap-to-open-Reports button below so its own radio
              buttons never nest inside another button (axe no-focusable-content). */}
          <Card
            style={{
              background: 'linear-gradient(150deg, var(--blue-600), var(--blue-700) 60%, #1e3a8a)',
              boxShadow: '0 10px 24px rgba(37, 99, 235, 0.28)',
              color: '#ffffff',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ opacity: 0.85 }}
              >
                This {period}
              </span>
              <PeriodSelector
                value={period}
                onChange={handlePeriodChange}
                periods={HOME_PERIODS}
                variant="inverse"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate('/money')}
              className="mt-3 block w-full text-left"
            >
              <p className="text-[11px]" style={{ opacity: 0.8 }}>
                Net balance · {periodLabel}
              </p>
              <p className="mt-0.5 text-[31px] font-extrabold tracking-tight">
                <MoneyText
                  amountMinorUnits={report.netMinorUnits}
                  currency={baseCurrency}
                  showSign
                  color="#ffffff"
                />
              </p>
              <div className="mt-3.5 flex gap-4">
                <div className="flex-1">
                  <p className="text-[10.5px]" style={{ opacity: 0.8 }}>
                    Income
                  </p>
                  <p className="text-sm font-bold">
                    <MoneyText
                      amountMinorUnits={report.income.totalMinorUnits}
                      currency={baseCurrency}
                      approximate={report.income.wasConverted}
                      color="#ffffff"
                    />
                  </p>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                    style={{ background: 'rgba(255, 255, 255, 0.25)' }}
                    role="img"
                    aria-label={`Income vs expense comparison for ${periodLabel}`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${incomeBarPct}%`, background: '#ffffff' }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[10.5px]" style={{ opacity: 0.8 }}>
                    Expense
                  </p>
                  <p className="text-sm font-bold">
                    {/* Bare red text has poor contrast directly on the blue
                        gradient (fails WCAG AA at any saturation that still
                        reads as "red" rather than near-white) — the
                        `--color-expense` / `--color-expense-soft` pairing
                        already used by Badge's "expense" tone is contrast-
                        vetted independent of whatever it's placed on. */}
                    <span
                      className="inline-flex rounded-md px-1.5 py-0.5"
                      style={{ background: 'var(--color-expense-soft)' }}
                    >
                      <MoneyText
                        amountMinorUnits={report.expense.totalMinorUnits}
                        currency={baseCurrency}
                        approximate={report.expense.wasConverted}
                        color="var(--color-expense)"
                      />
                    </span>
                  </p>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                    style={{ background: 'rgba(255, 255, 255, 0.25)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${expenseBarPct}%`, background: 'var(--blue-200)' }}
                    />
                  </div>
                </div>
              </div>
            </button>
          </Card>

          <div className="flex gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.href)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2.5 text-center text-[10.5px] font-semibold"
                style={{
                  background: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-card)',
                  color: 'var(--color-text)',
                }}
              >
                <span aria-hidden="true" className="text-[17px]">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>

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

          {showBanner && bannerKind && (
            <Card
              className="flex items-center gap-3"
              style={{
                background: 'var(--color-primary-soft)',
                border: '1px solid var(--blue-200)',
              }}
            >
              <span aria-hidden="true" className="text-xl">
                {BANNER_COPY[bannerKind].icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{BANNER_COPY[bannerKind].title}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {weekTasks.length} planned · {weekDoneCount} done
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(BANNER_COPY[bannerKind].href)}>
                Start
              </Button>
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
                    leading={
                      <CategoryIcon icon="📝" color={note.color || 'var(--color-primary)'} />
                    }
                    title={note.title || 'Untitled'}
                    subtitle={note.contentText ? noteSnippet(note.contentText) : undefined}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tourOpen && (
        <GettingStartedTour
          onClose={() => {
            setTourOpen(false)
            // Any way of closing the tour (Skip, Done, scrim, Escape, back
            // gesture) counts as "seen it" — same permanent dismissal as
            // the entry card's own ✕, so it never re-prompts afterward.
            handleDismissTour()
          }}
        />
      )}
    </div>
  )
}
