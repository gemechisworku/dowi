import { useNavigate } from 'react-router'
import { TaskSheet } from './TaskSheet'

/**
 * `/tasks/new` — the standalone create-task entry point for Home's quick
 * actions and the PWA manifest shortcut (`vite.config.ts`). Chromeless per
 * `AppLayout`, mirroring `NewTransactionPage`: the same `TaskSheet` TasksPage
 * opens from its own FAB, mounted directly and closing back to the task list.
 */
export function NewTaskPage() {
  const navigate = useNavigate()
  return <TaskSheet onClose={() => navigate('/tasks')} />
}
