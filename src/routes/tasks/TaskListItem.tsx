import type { Task, TaskCollection, TaskPriority } from '@/db/types'
import { todayString } from '@/lib/period'
import { ListItem } from '@/components/ui/ListItem'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { TaskCheckbox } from '@/components/domain/TaskCheckbox'
import { formatDueLabel } from './dueLabel'
import { isOverdue, subtaskProgress } from './taskViews'

export interface TaskListItemProps {
  task: Task
  collection?: TaskCollection
  onToggleComplete: (task: Task, done: boolean) => void
  onOpen: (task: Task) => void
  onDelete: (task: Task) => void
}

const PRIORITY_TONE: Record<Exclude<TaskPriority, 'none'>, BadgeTone> = {
  low: 'primary',
  medium: 'warning',
  high: 'expense',
}
const PRIORITY_LABEL: Record<Exclude<TaskPriority, 'none'>, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

/** One task row, shared by every Tasks view (Today/Upcoming/All/Completed). */
export function TaskListItem({
  task,
  collection,
  onToggleComplete,
  onOpen,
  onDelete,
}: TaskListItemProps) {
  const today = todayString()
  const { done, total } = subtaskProgress(task)
  const overdue = isOverdue(task, today)
  const dueLabel = formatDueLabel(task, today)
  const isDone = task.status === 'done'

  const subtitleParts = [
    dueLabel,
    collection?.name,
    total > 0 ? `${done}/${total} subtasks` : undefined,
  ].filter((part): part is string => Boolean(part))

  return (
    <SwipeableRow onSwipeLeft={() => onDelete(task)}>
      <ListItem
        onClick={() => onOpen(task)}
        leading={
          <TaskCheckbox
            checked={isDone}
            onChange={(checked) => onToggleComplete(task, checked)}
            label={isDone ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
          />
        }
        title={
          <span
            style={{
              textDecoration: isDone ? 'line-through' : undefined,
              color: isDone ? 'var(--color-text-muted)' : undefined,
            }}
          >
            {task.title}
          </span>
        }
        subtitle={
          subtitleParts.length > 0 ? (
            <span style={{ color: overdue ? 'var(--color-expense)' : undefined }}>
              {subtitleParts.join(' · ')}
            </span>
          ) : undefined
        }
        trailing={
          task.priority !== 'none' ? (
            <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          ) : undefined
        }
      />
    </SwipeableRow>
  )
}
