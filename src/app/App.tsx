import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './shell/AppLayout'
import { ThemeProvider } from './theme/ThemeProvider'
import { DatabaseProvider } from './db/DatabaseProvider'
import { ApplyAppearance } from './settings/ApplyAppearance'
import { SnackbarProvider } from '@/components/ui/SnackbarProvider'
import { HomePage } from '@/routes/home/HomePage'
import { MoneyPage } from '@/routes/money/MoneyPage'
import { NewTransactionPage } from '@/routes/money/NewTransactionPage'
import { ReportsPage } from '@/routes/money/reports/ReportsPage'
import { CategoriesPage } from '@/routes/money/CategoriesPage'
import { SourcesPage } from '@/routes/money/SourcesPage'
import { AccountsPage } from '@/routes/money/AccountsPage'
import { RatesPage } from '@/routes/money/RatesPage'
import { NotesPage } from '@/routes/notes/NotesPage'
import { NoteEditorPage } from '@/routes/notes/NoteEditorPage'
import { NoteCollectionsPage } from '@/routes/notes/NoteCollectionsPage'
import { NoteTrashPage } from '@/routes/notes/NoteTrashPage'
import { TasksPage } from '@/routes/tasks/TasksPage'
import { NewTaskPage } from '@/routes/tasks/NewTaskPage'
import { TaskCollectionsPage } from '@/routes/tasks/TaskCollectionsPage'
import { PlanWeekPage } from '@/routes/tasks/PlanWeekPage'
import { ReviewWeekPage } from '@/routes/tasks/ReviewWeekPage'
import { NotificationsInboxPage } from '@/routes/notifications/NotificationsInboxPage'
import { SettingsPage } from '@/routes/settings/SettingsPage'
import { KitchenSinkPage } from '@/routes/kitchen-sink/KitchenSinkPage'
import { DataDebugPage } from '@/routes/debug/DataDebugPage'

export function App() {
  return (
    <ThemeProvider>
      <SnackbarProvider>
        <DatabaseProvider>
          <ApplyAppearance />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="money" element={<ReportsPage />} />
                <Route path="money/new" element={<NewTransactionPage />} />
                <Route path="money/transactions" element={<MoneyPage />} />
                <Route path="money/categories" element={<CategoriesPage />} />
                <Route path="money/sources" element={<SourcesPage />} />
                <Route path="money/accounts" element={<AccountsPage />} />
                <Route path="money/rates" element={<RatesPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="notes/collections" element={<NoteCollectionsPage />} />
                <Route path="notes/trash" element={<NoteTrashPage />} />
                <Route path="notes/new" element={<NoteEditorPage />} />
                <Route path="notes/:id" element={<NoteEditorPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="tasks/new" element={<NewTaskPage />} />
                <Route path="tasks/collections" element={<TaskCollectionsPage />} />
                <Route path="tasks/plan" element={<PlanWeekPage />} />
                <Route path="tasks/review" element={<ReviewWeekPage />} />
                <Route path="notifications" element={<NotificationsInboxPage />} />
                <Route path="settings" element={<SettingsPage />} />
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
