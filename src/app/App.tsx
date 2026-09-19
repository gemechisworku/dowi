import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './shell/AppLayout'
import { ThemeProvider } from './theme/ThemeProvider'
import { DatabaseProvider } from './db/DatabaseProvider'
import { SnackbarProvider } from '@/components/ui/SnackbarProvider'
import { HomePage } from '@/routes/home/HomePage'
import { MoneyPage } from '@/routes/money/MoneyPage'
import { NotesPage } from '@/routes/notes/NotesPage'
import { TasksPage } from '@/routes/tasks/TasksPage'
import { KitchenSinkPage } from '@/routes/kitchen-sink/KitchenSinkPage'
import { DataDebugPage } from '@/routes/debug/DataDebugPage'

export function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider>
        <DatabaseProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="money" element={<MoneyPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="kitchen-sink" element={<KitchenSinkPage />} />
                <Route path="debug/data" element={<DataDebugPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DatabaseProvider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}
