import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '@/lib/cn'
import { BRAND_GRADIENT, BRAND_FG } from '@/styles/brandSurface'

export interface SectionTabsItem {
  to: string
  label: string
}

export interface SectionTabsProps {
  items: readonly SectionTabsItem[]
  label: string
  className?: string
}

/**
 * The section-tabs "page menu" shared by Money/Notes/Tasks (each screen's
 * own way back to its sibling sections — see each *SubNav's git history for
 * why one is needed at all). Styled as its own brand-gradient bar — the
 * same BRAND_GRADIENT as the top app bar and Home's hero card — so the
 * bold-brand header language covers every persistent menu, not just the app
 * bar itself.
 */
export function SectionTabs({ items, label, className }: SectionTabsProps) {
  const { pathname } = useLocation()
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  return (
    <nav
      aria-label={label}
      className={cn('flex gap-1 overflow-x-auto rounded-full p-1', className)}
      style={{ background: BRAND_GRADIENT, scrollbarWidth: 'none' }}
    >
      {items.map((item) => {
        const isActive = item.to === pathname
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            ref={isActive ? activeRef : undefined}
            className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
            style={{
              background: isActive ? BRAND_FG : 'transparent',
              color: isActive ? 'var(--blue-700)' : 'rgba(255, 255, 255, 0.85)',
            }}
          >
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
