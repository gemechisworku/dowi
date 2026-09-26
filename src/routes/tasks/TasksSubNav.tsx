import { SectionTabs } from '@/components/ui/SectionTabs'

const ITEMS = [
  { to: '/tasks', label: 'Tasks' },
  { to: '/tasks/collections', label: 'Collections' },
  { to: '/tasks/plan', label: 'Plan week' },
  { to: '/tasks/review', label: 'Review week' },
]

/**
 * Section tabs shared by every screen under Tasks, mirroring Money's
 * `MoneySubNav` (see docs/PLAN.md's "Post-M4 fix" for why: a screen with no
 * way back to its siblings is a dead end). Same auto-scroll-into-view
 * behaviour for the active tab, kept even though these 4 short labels fit
 * without scrolling on every device tried — cheap insurance if that ever
 * stops being true.
 */
export function TasksSubNav() {
  return <SectionTabs label="Task sections" items={ITEMS} />
}
