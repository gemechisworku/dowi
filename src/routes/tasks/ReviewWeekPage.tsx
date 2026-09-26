import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { formatWeekRangeLabel, getNextWeek, getThisWeek } from './week'
import { TasksSubNav } from './TasksSubNav'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListItem } from '@/components/ui/ListItem'
import { Button } from '@/components/ui/Button'
import { TextArea } from '@/components/ui/TextArea'
import { Field } from '@/components/ui/Field'
import { ProgressBar } from '@/components/domain/ProgressBar'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

const REVIEWS_COLLECTION_NAME = 'Weekly reviews'

interface ReflectionFieldProps {
  /** The saved reflection's text, or "" for a week with none yet. */
  initialValue: string
  onSave: (text: string) => Promise<void>
}

/**
 * Its own component so it can seed `useState` straight from a prop that's
 * only correct once — `notes` starts as `EMPTY_ARRAY` on `ReviewWeekPage`'s
 * very first render (`useLiveQuery` resolves asynchronously) and only
 * becomes the real data a moment later. `ReviewWeekPage` mounts this only
 * once that's happened (keyed by the week, so switching weeks remounts it
 * too), so the initializer below always captures the right value — no
 * effect-based sync required.
 */
function ReflectionField({ initialValue, onSave }: ReflectionFieldProps) {
  const [reflection, setReflection] = useState(initialValue)
  const [saved, setSaved] = useState(false)

  return (
    <>
      <Field hint="Saved as a note in Weekly reviews">
        {({ inputId }) => (
          <TextArea
            id={inputId}
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value)
              setSaved(false)
            }}
            rows={4}
            placeholder="How did the week go?"
          />
        )}
      </Field>
      <Button
        className="mt-2"
        onClick={() => {
          void onSave(reflection)
          setSaved(true)
        }}
        disabled={saved}
      >
        Save reflection
      </Button>
    </>
  )
}

/**
 * Review-the-week screen (PLAN §M6): Done/Not-done split with a completion
 * rate, a reflection saved as a real note (in an on-demand "Weekly reviews"
 * collection — the M2 notes data layer already exists even though M5's
 * editor UI doesn't yet, so this writes a plain-text note directly rather
 * than waiting on M5), and a carry-forward action for what's left undone.
 */
export function ReviewWeekPage() {
  const { repos } = useDatabase()
  const tasks = useLiveQuery(() => repos.tasks.list(), [repos], EMPTY_ARRAY)
  const notes = useLiveQuery(() => repos.notes.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const thisWeek = useMemo(() => getThisWeek(), [])
  const nextWeek = useMemo(() => getNextWeek(), [])
  const reviewTitle = `Week review — ${thisWeek.weekKey}`

  const weekTasks = tasks.filter((t) => t.weekKey === thisWeek.weekKey)
  const done = weekTasks.filter((t) => t.status === 'done')
  const notDone = weekTasks.filter((t) => t.status !== 'done')
  const completionRate = weekTasks.length > 0 ? done.length / weekTasks.length : 0

  const existingReview = notes.find((n) => n.title === reviewTitle)

  async function handleSaveReflection(text: string) {
    const collections = await repos.noteCollections.list()
    let collection = collections.find((c) => c.name === REVIEWS_COLLECTION_NAME)
    if (!collection) {
      collection = await repos.noteCollections.create({
        name: REVIEWS_COLLECTION_NAME,
        color: 'var(--color-primary)',
        icon: '🗒️',
      })
    }

    const trimmed = text.trim()
    if (existingReview) {
      await repos.notes.update(existingReview.id, { contentJSON: trimmed, contentText: trimmed })
    } else {
      await repos.notes.create({
        title: reviewTitle,
        contentJSON: trimmed,
        contentText: trimmed,
        collectionId: collection.id,
        tags: [],
        pinned: false,
      })
    }
    show({ message: 'Reflection saved' })
  }

  async function handleCarryForward() {
    await Promise.all(notDone.map((t) => repos.tasks.update(t.id, { weekKey: nextWeek.weekKey })))
    show({
      message: `Moved ${notDone.length} task${notDone.length === 1 ? '' : 's'} to next week`,
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeaderBand>
        <div>
        <Link
          to="/tasks"
          className="text-sm font-semibold"
          style={{ color: 'var(--color-on-brand-muted)' }}
        >
          ‹ Tasks
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Review the week</h1>
        <p className="text-sm" style={{ color: 'var(--color-on-brand-muted)' }}>
          {formatWeekRangeLabel(thisWeek.range)}
        </p>
      </div>

        <TasksSubNav />
      </PageHeaderBand>

      <div className="flex flex-col gap-4 px-4">
      {weekTasks.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Nothing planned this week"
          description="Nothing to review yet."
        />
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <p className="font-bold">
                {done.length} of {weekTasks.length} done
              </p>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {Math.round(completionRate * 100)}%
              </p>
            </div>
            <ProgressBar
              value={completionRate}
              label={`${Math.round(completionRate * 100)}% of this week's tasks completed`}
              className="mt-2"
            />
          </Card>

          <div>
            <SectionHeader title={`Done (${done.length})`} />
            {done.length === 0 ? (
              <EmptyState icon="🙈" title="Nothing done yet" />
            ) : (
              <Card>
                {done.map((task) => (
                  <ListItem key={task.id} title={task.title} />
                ))}
              </Card>
            )}
          </div>

          <div>
            <SectionHeader
              title={`Not done (${notDone.length})`}
              action={
                notDone.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => void handleCarryForward()}
                    className="text-xs font-semibold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Carry forward to next week
                  </button>
                ) : undefined
              }
            />
            {notDone.length === 0 ? (
              <EmptyState icon="🎉" title="Everything got done" />
            ) : (
              <Card>
                {notDone.map((task) => (
                  <ListItem key={task.id} title={task.title} />
                ))}
              </Card>
            )}
          </div>
        </>
      )}

      <div>
        <SectionHeader title="Reflection" />
        {notes !== EMPTY_ARRAY && (
          <ReflectionField
            key={thisWeek.weekKey}
            initialValue={existingReview?.contentText ?? ''}
            onSave={handleSaveReflection}
          />
        )}
      </div>
      </div>
    </div>
  )
}
