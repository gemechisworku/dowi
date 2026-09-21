import type { ReminderConfig } from '@/db/types'

export type BannerKind = 'plan' | 'review'

/**
 * Which weekly banner (if any) belongs on Home today, purely from the
 * configured plan/review day (`settings.reminders.weekly{Plan,Review}.day`,
 * 0=Sunday..6=Saturday per `Date#getDay()`) against today's actual
 * day-of-week — deliberately independent of each reminder's own
 * `enabled`/notification-permission state, since this banner is Home's own
 * UI surface for the plan/review ritual, not a delivered notification (a
 * user who's turned off the *notification* for plan day hasn't thereby
 * opted out of the day itself). If both happen to be configured for the
 * same day, plan wins — reviewing before the week has been (re-)planned
 * would be the less useful order to default to.
 */
export function getBannerKind(
  reminders: Pick<ReminderConfig, 'weeklyPlan' | 'weeklyReview'>,
  today: string,
): BannerKind | null {
  const dayOfWeek = new Date(`${today}T00:00:00`).getDay()
  if (reminders.weeklyPlan.day === dayOfWeek) return 'plan'
  if (reminders.weeklyReview.day === dayOfWeek) return 'review'
  return null
}

const DISMISS_KEY = 'dowi:home:bannerDismissedOn'

/** True once the plan/review banner has already been dismissed for `today` ("YYYY-MM-DD") — reappears automatically tomorrow since the stored date won't match. */
export function isBannerDismissed(today: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === today
  } catch {
    return false
  }
}

export function dismissBannerForToday(today: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, today)
  } catch {
    // ignore persistence failures
  }
}
