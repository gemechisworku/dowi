import { SectionTabs } from '@/components/ui/SectionTabs'

const ITEMS = [
  { to: '/money', label: 'Reports' },
  { to: '/money/transactions', label: 'Transactions' },
  { to: '/money/recurring', label: 'Recurring' },
  { to: '/money/categories', label: 'Categories' },
  { to: '/money/sources', label: 'Sources' },
  { to: '/money/accounts', label: 'Accounts' },
  { to: '/money/rates', label: 'Rates' },
]

/**
 * Section tabs shared by every screen under Money. Reports is `/money`'s
 * index (the Money tab's landing page), so without this a user landing
 * anywhere else — Categories, Sources, an individual transaction — had no
 * way back to a sibling section except bouncing through Reports first.
 *
 * All 7 don't fit on one line at phone width, so the row scrolls — but the
 * active tab has to stay reachable at a glance rather than possibly sitting
 * scrolled out of view with nothing on screen showing which section you're
 * on. Scrolling it into view on every navigation is what makes that true.
 */
export function MoneySubNav() {
  return <SectionTabs label="Money sections" items={ITEMS} />
}
