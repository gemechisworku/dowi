export type TourCategory = 'money' | 'tasks' | 'notes'

export interface TourStep {
  category: TourCategory
  icon: string
  heading: string
  description: string
}

export const TOUR_CATEGORIES: { value: TourCategory; label: string; icon: string }[] = [
  { value: 'money', label: 'Money', icon: '💰' },
  { value: 'tasks', label: 'Tasks', icon: '✅' },
  { value: 'notes', label: 'Notes', icon: '📝' },
]

/** Two short steps per category — a brief walkthrough, not a manual. */
export const TOUR_STEPS: TourStep[] = [
  {
    category: 'money',
    icon: '💸',
    heading: 'Log income & expenses',
    description:
      'Quick amount entry, categories for both income and spending, and any currency you use.',
  },
  {
    category: 'money',
    icon: '📊',
    heading: 'See your reports',
    description:
      'Week, month or year totals, a breakdown by category, and an export whenever you want one.',
  },
  {
    category: 'tasks',
    icon: '✅',
    heading: 'Capture and organize',
    description:
      'Due dates, priorities, subtasks and collections — as much or as little detail as you need.',
  },
  {
    category: 'tasks',
    icon: '🗓️',
    heading: 'Plan & review your week',
    description:
      'A Monday-to-Sunday ritual: plan what matters, then review how the week actually went.',
  },
  {
    category: 'notes',
    icon: '📝',
    heading: 'Write freely',
    description:
      "Headings, checklists, highlights and more — rich formatting for whatever you're writing.",
  },
  {
    category: 'notes',
    icon: '🔍',
    heading: 'Find things fast',
    description:
      'Search across every note, pin the ones you revisit, and group them into collections.',
  },
]
