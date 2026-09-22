import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { DEFAULT_STREAK_STATE, isNewMilestone } from '@/db/streakRepo'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ConfettiBurst } from './ConfettiBurst'

/**
 * Mounted once at the app root (App.tsx) rather than on Home, since a
 * qualifying action (adding a transaction, note or task) can happen from
 * any screen — the celebration needs to fire wherever the user actually
 * is, not just when they next visit Home. Purely an in-app, animated
 * reward (not an OS notification): see the morning/evening reminders in
 * Settings for the notification-based half of the ask.
 */
export function StreakCelebrationOverlay() {
  const { repos } = useDatabase()
  const streak = useLiveQuery(() => repos.streak.get(), [repos], DEFAULT_STREAK_STATE)
  const open = isNewMilestone(streak)

  async function handleDismiss() {
    await repos.streak.markCelebrated(streak.currentStreak)
  }

  return (
    <>
      <ConfettiBurst active={open} />
      <Dialog
        open={open}
        onClose={handleDismiss}
        title={`${streak.currentStreak}-day streak! 🔥`}
        actions={<Button onClick={handleDismiss}>Nice!</Button>}
      >
        You&apos;ve used Dowi {streak.currentStreak} days in a row. Keep it going!
      </Dialog>
    </>
  )
}
