import type { SVGProps } from 'react'

export type AppIconName =
  | 'arrow-left'
  | 'bell'
  | 'check'
  | 'flame'
  | 'home'
  | 'money'
  | 'moon'
  | 'notes'
  | 'settings'
  | 'sun'
  | 'system'
  | 'tasks'

const PATHS: Record<AppIconName, React.ReactNode> = {
  'arrow-left': <><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></>,
  bell: <><path d="M10.27 21h3.46"/><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  flame: <path d="M12 22c4 0 7-3 7-7 0-3-1.5-5.5-4-7 .2 2-1 3.3-2 4-1-4-3.5-6.5-6-8 .2 3-2 5-2 9 0 5 3 9 7 9Z"/>,
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  money: <><circle cx="12" cy="12" r="9"/><path d="M16 8.5c-.8-.8-2-1.2-3.5-1.2-2 0-3.5 1-3.5 2.5 0 3.7 7 1.6 7 5.3 0 1.5-1.5 2.6-3.7 2.6-1.7 0-3.1-.5-4.1-1.4M12 5v14"/></>,
  moon: <path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
  notes: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z"/><path d="M8 4v16M11 9h5M11 13h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  system: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  tasks: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
}

export function AppIcon({ name, ...props }: { name: AppIconName } & SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{PATHS[name]}</svg>
}