import type { NotificationType } from '@/db/types'

export interface NotificationTypeCopy {
  icon: string
  /** A longer sentence explaining *why* this notification exists, shown under its own title/body on the detail page. */
  explanation: string
  /** The detail page's single primary action button label. */
  actionLabel: string
}

const COPY: Record<NotificationType, NotificationTypeCopy> = {
  'weekly-plan': {
    icon: '🗓️',
    explanation: 'A fresh week is a good moment to lay out what you want to get done.',
    actionLabel: 'Plan your week',
  },
  'weekly-review': {
    icon: '📋',
    explanation: 'See what got done this week and reflect on it before it fades.',
    actionLabel: 'Review your week',
  },
  'task-due': {
    icon: '✅',
    explanation: 'This task is due — open it to mark it done or reschedule it.',
    actionLabel: 'Open task',
  },
  'daily-agenda': {
    icon: '☀️',
    explanation: "Here's a look at what's on your plate today.",
    actionLabel: 'View agenda',
  },
  'backup-nudge': {
    icon: '💾',
    explanation:
      "It's been a while since your last export — back up your data in case anything happens to this device.",
    actionLabel: 'Back up now',
  },
  'morning-nudge': {
    icon: '☀️',
    explanation: "Log today's income, expenses, notes or tasks to keep Dowi useful.",
    actionLabel: 'Open Dowi',
  },
  'evening-streak': {
    icon: '🔥',
    explanation: "You haven't logged anything today yet — add something to keep your streak alive.",
    actionLabel: 'Log something',
  },
  'evening-summary': {
    icon: '🎉',
    explanation: "Here's a recap of what you got done today.",
    actionLabel: 'Open Dowi',
  },
  'recurring-due': {
    icon: '🔁',
    explanation:
      'A recurring payment is due. Review the details and confirm to record it — nothing is added until you do.',
    actionLabel: 'Confirm & record',
  },
}

export function getNotificationTypeCopy(type: NotificationType): NotificationTypeCopy {
  return COPY[type]
}
