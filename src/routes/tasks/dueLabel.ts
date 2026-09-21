import type { Task } from '@/db/types'
import { shiftPeriod } from '@/lib/period'
import { dueDate, isOverdue } from './taskViews'

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
const WEEKDAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

/** A day-group header for the Upcoming view, e.g. "Tomorrow" or "Fri, Sep 25". */
export function formatGroupDateLabel(date: string, today: string): string {
  if (date === shiftPeriod('day', today, 1)) return 'Tomorrow'
  return WEEKDAY_DATE_FORMATTER.format(new Date(`${date}T00:00:00`))
}

/** A human due-date label for a task row, e.g. "Overdue · Sep 19", "Today · 2:30 PM", "Tomorrow", "Sep 25". */
export function formatDueLabel(task: Task, today: string): string | undefined {
  const date = dueDate(task)
  if (!date) return undefined

  const time = task.dueAt?.slice(11, 16)
  const timeLabel = time ? TIME_FORMATTER.format(new Date(`2000-01-01T${time}:00`)) : undefined

  if (isOverdue(task, today)) {
    return `Overdue · ${SHORT_DATE_FORMATTER.format(new Date(`${date}T00:00:00`))}`
  }
  if (date === today) {
    return timeLabel ? `Today · ${timeLabel}` : 'Today'
  }
  if (date === shiftPeriod('day', today, 1)) {
    return timeLabel ? `Tomorrow · ${timeLabel}` : 'Tomorrow'
  }
  return SHORT_DATE_FORMATTER.format(new Date(`${date}T00:00:00`))
}
