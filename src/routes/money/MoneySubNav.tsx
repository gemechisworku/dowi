import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'

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
  const { pathname } = useLocation()
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <nav
      aria-label="Money sections"
      className="flex gap-1 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {ITEMS.map((item) => {
        const isActive = item.to === pathname
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            ref={isActive ? activeRef : undefined}
            className="shrink-0 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'var(--color-primary-fg)' : 'var(--color-text-muted)',
            }}
          >
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
