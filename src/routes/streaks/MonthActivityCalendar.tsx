import { buildMonthGrid, getMonthLabel, intensityLevel } from './monthCalendar'

export interface MonthActivityCalendarProps {
  /** "YYYY-MM". */
  monthKey: string
  /** Matches Settings' own week-start-day, so this agrees with Money/Reports on what a "week" is. */
  weekStartsOn: number
  activityByDate: ReadonlyMap<string, number>
  /** Every date in the current unbroken streak (monthCalendar.ts's getCurrentStreakDates) — marked with a distinct inset ring, not just color, so it isn't a colour-only cue. */
  streakDates: ReadonlySet<string>
  /** "YYYY-MM-DD". */
  today: string
}

const HEAT_VAR: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'var(--heat-0)',
  1: 'var(--heat-1)',
  2: 'var(--heat-2)',
  3: 'var(--heat-3)',
  4: 'var(--heat-4)',
}

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

function weekdayHeaders(weekStartsOn: number): string[] {
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return [...base.slice(weekStartsOn), ...base.slice(0, weekStartsOn)]
}

/**
 * A GitHub-commit-style activity heatmap, laid out as an ordinary monthly
 * calendar grid (weekday columns × week rows) rather than GitHub's own
 * continuous week-strip — see monthCalendar.ts for the grid/intensity math.
 * Color encodes "how much" (a sequential one-hue ramp, --heat-0..4 —
 * tokens.css), but never carries meaning alone: today gets an outer ring
 * and a streak day gets a distinct inset ring, both shape-based cues that
 * still read in grayscale/CVD, not just color. The day number always sits
 * below the swatch on the card's own surface, never inside the colored
 * fill — five heat steps × two themes is too many background/text
 * pairings to hand-verify at 4.5:1 apiece (and dark mode's ramp direction
 * inverts, so no single lightness threshold predicts it); keeping text off
 * the series color entirely (dataviz's own "text wears text tokens, never
 * the series color" rule) sidesteps needing to.
 */
export function MonthActivityCalendar({
  monthKey,
  weekStartsOn,
  activityByDate,
  streakDates,
  today,
}: MonthActivityCalendarProps) {
  const weeks = buildMonthGrid(monthKey, weekStartsOn, activityByDate)

  return (
    <div>
      <div
        className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold"
        style={{ color: 'var(--color-text-muted)' }}
        aria-hidden="true"
      >
        {weekdayHeaders(weekStartsOn).map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div
        role="grid"
        aria-label={`Activity for ${getMonthLabel(monthKey)}`}
        className="flex flex-col gap-1.5"
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1.5">
            {week.map((cell, dayIndex) => {
              if (!cell.date) return <div key={dayIndex} aria-hidden="true" />
              const level = intensityLevel(cell.count)
              const isToday = cell.date === today
              const isStreak = streakDates.has(cell.date)
              const label = `${DAY_LABEL_FORMATTER.format(new Date(`${cell.date}T00:00:00`))}: ${
                cell.count === 0
                  ? 'no activity'
                  : `${cell.count} ${cell.count === 1 ? 'action' : 'actions'}`
              }${isToday ? ' (today)' : ''}${isStreak ? ' — part of your current streak' : ''}`
              const rings = [
                isToday && '0 0 0 2px var(--color-primary)',
                // Inset, unlike "today"'s outer ring — both fit within the
                // cell's own box so neither can be painted over by a
                // neighboring cell (an earlier absolutely-positioned emoji
                // badge here had exactly that bug: it stuck out past the
                // cell edge and a later sibling cell painted over it).
                isStreak && 'inset 0 0 0 2px var(--color-warning)',
              ]
                .filter(Boolean)
                .join(', ')
              return (
                <div
                  key={dayIndex}
                  role="gridcell"
                  aria-label={label}
                  title={label}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div
                    aria-hidden="true"
                    className="aspect-square w-full rounded-[6px]"
                    style={{ background: HEAT_VAR[level], boxShadow: rings || undefined }}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(`${cell.date}T00:00:00`).getDate()}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div
        className="mt-3 flex items-center justify-end gap-1.5 text-[11px]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            aria-hidden="true"
            className="h-3 w-3 rounded-[3px]"
            style={{ background: HEAT_VAR[level] }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
