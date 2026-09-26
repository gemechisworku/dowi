import { SectionTabs } from '@/components/ui/SectionTabs'

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
  return <SectionTabs label="Note sections" items={ITEMS} />
}
