import type { Note, NoteCollection } from '@/db/types'
import type { NoteDensity } from './notePrefs'
import { ListItem } from '@/components/ui/ListItem'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { IconButton } from '@/components/ui/IconButton'
import { CollectionChip } from '@/components/domain/CollectionChip'

export interface NoteListItemProps {
  note: Note
  collection?: NoteCollection
  density: NoteDensity
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onDuplicate: (note: Note) => void
  onDelete: (note: Note) => void
}

const UPDATED_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })

function snippetOf(note: Note): string | undefined {
  const text = note.contentText.trim()
  if (!text) return undefined
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

/** One note row/card, shared by NotesPage's date and collection groupings. Swipe-left deletes (with undo), matching TaskListItem's shape. */
export function NoteListItem({
  note,
  collection,
  density,
  onOpen,
  onTogglePin,
  onDuplicate,
  onDelete,
}: NoteListItemProps) {
  const snippet = snippetOf(note)
  const trailing = (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconButton
        aria-label={
          note.pinned ? `Unpin "${note.title || 'Untitled'}"` : `Pin "${note.title || 'Untitled'}"`
        }
        aria-pressed={note.pinned}
        icon={note.pinned ? '📌' : '📍'}
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onTogglePin(note)
        }}
      />
      <IconButton
        aria-label={`Duplicate "${note.title || 'Untitled'}"`}
        icon="⧉"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation()
          onDuplicate(note)
        }}
      />
    </div>
  )

  if (density === 'card') {
    return (
      <SwipeableRow onSwipeLeft={() => onDelete(note)}>
        <button
          type="button"
          onClick={() => onOpen(note)}
          className="flex w-full flex-col gap-2 rounded-[var(--radius-lg)] p-4 text-left active:opacity-80"
          style={{
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-card)',
            borderLeft: note.color ? `4px solid ${note.color}` : undefined,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <h3
              className="min-w-0 flex-1 truncate text-[15px] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {note.title || 'Untitled'}
            </h3>
            {trailing}
          </div>
          {snippet && (
            <p className="line-clamp-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {snippet}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {collection && (
              <CollectionChip name={collection.name} color={collection.color} selected />
            )}
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
              >
                #{tag}
              </span>
            ))}
            <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {UPDATED_FORMATTER.format(new Date(note.updatedAt))}
            </span>
          </div>
        </button>
      </SwipeableRow>
    )
  }

  const subtitleParts = [
    snippet,
    collection?.name,
    note.tags.length > 0 ? note.tags.map((t) => `#${t}`).join(' ') : undefined,
  ].filter((part): part is string => Boolean(part))

  return (
    <SwipeableRow onSwipeLeft={() => onDelete(note)}>
      <ListItem
        onClick={() => onOpen(note)}
        leading={
          note.color ? (
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: note.color }}
            />
          ) : undefined
        }
        title={note.title || 'Untitled'}
        subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
        trailing={trailing}
      />
    </SwipeableRow>
  )
}
