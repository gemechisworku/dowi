import { Outlet, useLocation } from 'react-router'
import { TopAppBar } from './TopAppBar'
import { BottomNav } from './BottomNav'

// Routes that render full-screen (editors, sheets-as-pages) hide the
// chrome per PRD §4 ("hidden on full-screen editors").
const CHROMELESS_PREFIXES = ['/money/new', '/notes/', '/tasks/new']

function isChromeless(pathname: string): boolean {
  if (pathname === '/notes') return false
  return CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function AppLayout() {
  const location = useLocation()
  const chromeless = isChromeless(location.pathname)

  if (chromeless) {
    return (
      <main className="flex-1">
        <Outlet />
      </main>
    )
  }

  return (
    <>
      <TopAppBar />
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}
