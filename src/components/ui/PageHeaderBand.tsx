import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface PageHeaderBandProps {
  children: ReactNode
  className?: string
}

/** Shared branded region for a page title, section navigation, and immediate filters. */
export function PageHeaderBand({ children, className }: PageHeaderBandProps) {
  return <header className={cn('dowi-page-band flex flex-col gap-3', className)}>{children}</header>
}