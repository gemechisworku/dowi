import { NavLink } from 'react-router'
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon'

interface NavItem {
  to: string
  label: string
  icon: AppIconName
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/money', label: 'Money', icon: 'money' },
  { to: '/notes', label: 'Notes', icon: 'notes' },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
]

/**
 * Floating rounded bottom nav, per Option A "Soft Cards".
 * Hidden on full-screen editor routes by AppLayout, not by this component.
 */
export function BottomNav() {
  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Primary"
        className="pointer-events-auto mx-auto grid grid-cols-4 rounded-[var(--radius-lg)] border p-1.5 backdrop-blur-xl"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderColor: 'var(--color-border)' }}
      >
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex h-12 flex-col items-center justify-center gap-1 rounded-[12px] px-1 text-[11px] font-medium transition-colors"
            style={({ isActive }) => ({
              background: isActive ? 'var(--color-primary-soft)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            })}
          >
            <AppIcon name={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
