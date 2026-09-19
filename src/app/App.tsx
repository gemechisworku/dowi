import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './shell/AppLayout'
import { ThemeProvider } from './theme/ThemeProvider'
import { HomePage } from '@/routes/home/HomePage'
import { MoneyPage } from '@/routes/money/MoneyPage'
import { NotesPage } from '@/routes/notes/NotesPage'
import { TasksPage } from '@/routes/tasks/TasksPage'
import { KitchenSinkPage } from '@/routes/kitchen-sink/KitchenSinkPage'

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="money" element={<MoneyPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="kitchen-sink" element={<KitchenSinkPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
