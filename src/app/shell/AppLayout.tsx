import { Outlet, useLocation } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import { useNotificationRuntime } from '@/app/notifications/useNotificationRuntime'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { TopAppBar } from './TopAppBar'
import { BottomNav } from './BottomNav'

// Routes that render full-screen (editors, sheets-as-pages) hide the
// chrome per PRD §4 ("hidden on full-screen editors"). The note editor
// (`/notes/new`, `/notes/:id`) wants the whole viewport for typing;
// `/money/new` and `/tasks/new` (M8) are the same idea for a create sheet
// reached directly by URL — Home's quick actions and the PWA manifest
// shortcuts — rather than via each list page's own local `addOpen` state.
// `/money/recurring/confirm` is the same treatment for confirming a
// recurring occurrence from a notification tap — note it's deliberately the
// longer, more specific path (not `/money/recurring`), so the recurring
// templates list page itself keeps its normal chrome.
const CHROMELESS_PREFIXES = ['/money/new', '/money/recurring/confirm', '/notes/new', '/tasks/new']

// Everything else under /notes/ (collections, trash) is an ordinary
// list/CRUD screen and keeps the chrome + NotesSubNav, same as Tasks'
// sibling screens under /tasks/.
const NOTES_CHROME_PATHS = new Set(['/notes/collections', '/notes/trash'])

function isChromeless(pathname: string): boolean {
  if (pathname === '/notes') return false
  if (pathname.startsWith('/notes/')) {
    return !NOTES_CHROME_PATHS.has(pathname)
  }
  return CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function AppLayout() {
  const location = useLocation()
  const chromeless = isChromeless(location.pathname)
  const { notificationsRepo } = useDatabase()
  const unread = useLiveQuery(
    () => notificationsRepo.listUnread(),
    [notificationsRepo],
    EMPTY_ARRAY,
  )
  useNotificationRuntime()

  if (chromeless) {
    return (
      <main className="flex-1">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopAppBar unreadNotifications={unread.length} />
      <main className="flex-1 pb-28"><Outlet /></main>
      <BottomNav />
    </div>
  )
}
