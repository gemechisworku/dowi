import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'

const ITEMS = [
  { to: '/notes', label: 'Notes' },
  { to: '/notes/collections', label: 'Collections' },
  { to: '/notes/trash', label: 'Trash' },
]

/**
 * Section tabs shared by every chrome-visible screen under Notes, mirroring
 * Money's `MoneySubNav` / Tasks' `TasksSubNav` (see PLAN.md's "Post-M4 fix"
 * for why a screen with no way back to its siblings is a dead end). The
 * note editor itself (`/notes/new`, `/notes/:id`) is deliberately excluded —
 * it's a full-screen, chromeless route with its own back button, not one of
 * these tabs.
 */
export function NotesSubNav() {
  const { pathname } = useLocation()
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <nav
      aria-label="Note sections"
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
