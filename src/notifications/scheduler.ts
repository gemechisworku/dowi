/**
 * The `ReminderScheduler` interface (PRD OD-1 §12) — `WebScheduler` here is
 * the only implementation in v1.0. A future `CapacitorScheduler` could
 * implement the same interface for exact scheduled alarms, added only if
 * M7's real-phone testing (TESTING.md §M7) shows PWA delivery is too
 * unreliable in practice.
 */

import type { DowiDatabase } from '@/db/db'
import type { NotificationsRepo } from '@/db/notificationsRepo'
import type { SettingsRepo } from '@/db/settingsRepo'
import type { Repositories } from '@/db/repositories'
import { SEEDED_META_KEY } from '@/db/seed'
import { createStreakRepo } from '@/db/streakRepo'
import { computeDueReminders, isWithinQuietHours } from '@/lib/reminders'
import { computeDueRecurring } from '@/lib/recurrence'
import { computeDailySummary } from '@/lib/dailySummary'
import { todayString } from '@/lib/period'
import { showOsNotification } from './deliver'
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from './permission'

export interface ReminderScheduler {
  /**
   * Runs on every app open (and opportunistically via the service worker's
   * periodicsync when the platform supports it): writes an inbox entry for
   * everything newly due and attempts OS delivery for each — exactly once
   * per occurrence, since dedup is keyed off what's already in the
   * `notifications` table (AC-P2).
   */
  catchUp(): Promise<void>
  /**
   * Requests permission if it hasn't been decided yet, then shows one
   * notification immediately. Doesn't write an inbox entry — a test ping
   * isn't a real reminder occurrence — and deliberately ignores quiet
   * hours, since the user just asked for it right now (AC-P1).
   */
  sendTest(): Promise<{ delivered: boolean; permission: NotificationPermissionState }>
}

export interface WebSchedulerDeps {
  db: DowiDatabase
  settingsRepo: SettingsRepo
  notificationsRepo: NotificationsRepo
  repos: Pick<Repositories, 'tasks' | 'transactions' | 'notes' | 'recurring'>
}

export function createWebScheduler({
  db,
  settingsRepo,
  notificationsRepo,
  repos,
}: WebSchedulerDeps): ReminderScheduler {
  return {
    async catchUp() {
      const [
        settings,
        tasks,
        transactions,
        notes,
        existing,
        installedMeta,
        streak,
        recurringTemplates,
      ] = await Promise.all([
        settingsRepo.get(),
        repos.tasks.list(),
        repos.transactions.list(),
        repos.notes.list(),
        notificationsRepo.list(),
        db.meta.get(SEEDED_META_KEY),
        createStreakRepo(db).get(),
        repos.recurring.list(),
      ])
      const now = new Date()
      const installedAt = installedMeta?.value ?? now.toISOString()
      const dailySummary = computeDailySummary(
        transactions,
        tasks,
        notes,
        todayString(),
        settings.baseCurrency,
      )
      const due = computeDueReminders({
        settings,
        tasks,
        now,
        existing,
        installedAt,
        streakLastActiveDate: streak.lastActiveDate,
        currentStreak: streak.currentStreak,
        dailySummary,
      })
      const dueRecurring = computeDueRecurring({
        templates: recurringTemplates.filter((t) => !t.paused),
        existingTransactions: transactions.map((t) => ({
          recurringId: t.recurringId,
          date: t.date,
        })),
        existingNotifications: existing,
        today: todayString(),
      })
      if (
        due.length === 0 &&
        dueRecurring.autoRecord.length === 0 &&
        dueRecurring.remind.length === 0
      ) {
        return
      }

      const permission = getNotificationPermission()
      const quiet = isWithinQuietHours(now, settings.reminders.quietHours)

      for (const reminder of due) {
        const created = await notificationsRepo.create({
          type: reminder.type,
          title: reminder.title,
          body: reminder.body,
          scheduledFor: reminder.scheduledFor,
          deepLink: reminder.deepLink,
          data: reminder.data,
        })
        if (permission === 'granted' && !quiet) {
          const delivered = await showOsNotification(reminder.title, {
            body: reminder.body,
            tag: created.id,
            deepLink: reminder.deepLink,
          })
          if (delivered) await notificationsRepo.markDelivered(created.id)
        }
      }

      // Recurring transactions (PRD §9): auto-record templates silently
      // create the real Transaction for every newly-due occurrence and
      // advance the template's state; remind-and-confirm templates raise a
      // notification instead and only advance state once the user actually
      // confirms (see recurringRepo.confirmOccurrence, called from
      // TransactionSheet's save path).
      for (const batch of dueRecurring.autoRecord) {
        for (const date of batch.occurrences) {
          await repos.transactions.create({
            type: batch.template.type,
            amountMinorUnits: batch.template.amountMinorUnits,
            currency: batch.template.currency,
            date,
            categoryId: batch.template.categoryId,
            sourceId: batch.template.sourceId,
            accountId: batch.template.accountId,
            note: batch.template.note,
            tags: batch.template.tags,
            recurringId: batch.template.id,
          })
        }
        await repos.recurring.update(batch.template.id, {
          occurrenceIndex: batch.finalOccurrenceIndex,
          nextDueDate: batch.finalNextDueDate,
          lastGeneratedDate: batch.finalLastGeneratedDate,
        })
      }

      for (const reminder of dueRecurring.remind) {
        const created = await notificationsRepo.create({
          type: 'recurring-due',
          title: reminder.title,
          body: reminder.body,
          scheduledFor: reminder.scheduledFor,
          deepLink: reminder.deepLink,
          data: { recurringId: reminder.template.id },
        })
        if (permission === 'granted' && !quiet) {
          const delivered = await showOsNotification(reminder.title, {
            body: reminder.body,
            tag: created.id,
            deepLink: reminder.deepLink,
          })
          if (delivered) await notificationsRepo.markDelivered(created.id)
        }
      }
    },

    async sendTest() {
      let permission = getNotificationPermission()
      if (permission === 'default') {
        permission = await requestNotificationPermission()
      }
      if (permission !== 'granted') return { delivered: false, permission }

      const delivered = await showOsNotification('Test notification', {
        body: 'This is what a Dowi reminder looks like.',
        tag: 'test-notification',
      })
      return { delivered, permission }
    },
  }
}
