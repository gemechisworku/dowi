import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'

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
  const { pathname } = useLocation()
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <nav
      aria-label="Task sections"
      className="flex gap-1.5 overflow-x-auto pb-1"
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
            className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
            style={{
              background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
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
