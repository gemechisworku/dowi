/**
 * "Week N" on Home's greeting header (PRD §5.1) counts weeks of *using
 * Dowi*, not the real calendar/ISO week — a person who installs the app in
 * September is on their week 1, not week 39. This is purely a display
 * concern: Money/Reports' financial-year totals and Tasks' weekly-plan
 * grouping both keep using the real calendar week (`getIsoWeekKey`,
 * `getFinancialYearRange`) exactly as before.
 */

/** Weeks since `installedAt` (meta.seededAt — the same baseline the M7 backup-nudge reminder already uses), 1-indexed. Falls back to 1 for a missing/invalid baseline or if the clock has somehow moved backwards, rather than a negative or NaN week number. */
export function getUsageWeekNumber(
  installedAt: string | undefined,
  now: Date = new Date(),
): number {
  const installedDate = installedAt ? new Date(installedAt) : null
  if (!installedDate || Number.isNaN(installedDate.getTime())) return 1

  const installedDayStart = new Date(
    installedDate.getFullYear(),
    installedDate.getMonth(),
    installedDate.getDate(),
  )
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((todayStart.getTime() - installedDayStart.getTime()) / 86_400_000)
  if (diffDays < 0) return 1

  return Math.floor(diffDays / 7) + 1
}
