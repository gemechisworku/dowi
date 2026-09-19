import { NavLink } from 'react-router'

interface NavItem {
  to: string
  label: string
  icon: string
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/money', label: 'Money', icon: '📊' },
  { to: '/notes', label: 'Notes', icon: '📝' },
  { to: '/tasks', label: 'Tasks', icon: '✅' },
]

/**
 * Floating rounded bottom nav, per Option A "Soft Cards".
 * Hidden on full-screen editor routes by AppLayout, not by this component.
 */
export function BottomNav() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Primary"
        className="pointer-events-auto mx-auto flex max-w-md justify-around rounded-[26px] px-1.5 py-2.5"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
      >
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-[11px] font-semibold transition-colors',
                isActive ? 'text-white' : '',
              ].join(' ')
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--color-primary)' : 'transparent',
              color: isActive ? 'var(--color-primary-fg)' : 'var(--color-text-muted)',
            })}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
