import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Note } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { todayString } from '@/lib/period'
import { filterNotesBySearch, groupNotesByCollection, groupNotesByDate } from './noteViews'
import { readDensity, readGroupingMode, writeDensity, writeGroupingMode } from './notePrefs'
import { NoteListItem } from './NoteListItem'
import { NotesSubNav } from './NotesSubNav'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

export function NotesPage() {
  const { repos } = useDatabase()
  const navigate = useNavigate()
  const notes = useLiveQuery(() => repos.notes.list(), [repos], EMPTY_ARRAY)
  const collections = useLiveQuery(() => repos.noteCollections.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const [grouping, setGrouping] = useState(readGroupingMode)
  const [density, setDensity] = useState(readDensity)
  const [search, setSearch] = useState('')

  const collectionById = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections])
  const today = todayString()

  function handleGroupingChange(mode: 'date' | 'collection') {
    setGrouping(mode)
    writeGroupingMode(mode)
  }

  function handleDensityChange(mode: 'list' | 'card') {
    setDensity(mode)
    writeDensity(mode)
  }

  async function handleTogglePin(note: Note) {
    await repos.notes.update(note.id, { pinned: !note.pinned })
  }

  async function handleDuplicate(note: Note) {
    await repos.notes.create({
      title: note.title,
      contentJSON: note.contentJSON,
      contentText: note.contentText,
      collectionId: note.collectionId,
      tags: note.tags,
      pinned: false,
      color: note.color,
    })
    show({ message: 'Note duplicated' })
  }

  async function handleDelete(note: Note) {
    await repos.notes.remove(note.id)
    show({
      message: 'Note deleted',
      action: { label: 'Undo', onClick: () => repos.notes.restore(note.id) },
    })
  }

  const filtered = filterNotesBySearch(notes, search)
  const groups =
    grouping === 'date'
      ? groupNotesByDate(filtered, today)
      : groupNotesByCollection(filtered, collections)

  return (
    <div className="relative flex flex-col pb-24">
      <PageHeaderBand>
        <h1 className="text-2xl font-bold">Notes</h1>
        <NotesSubNav />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          data-header-control
        />
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl
            label="Group by"
            value={grouping}
            onChange={handleGroupingChange}
            options={[
              { value: 'date', label: 'By date' },
              { value: 'collection', label: 'By collection' },
            ]}
            variant="inverse"
          />
          <SegmentedControl
            label="Density"
            value={density}
            onChange={handleDensityChange}
            options={[
              { value: 'list', label: '☰' },
              { value: 'card', label: '▦' },
            ]}
            variant="inverse"
          />
        </div>
      </PageHeaderBand>

      <div className="px-4 pt-3">
        {groups.length === 0 ? (
          <EmptyState
            icon="📝"
            title={search ? 'No notes match your search' : 'No notes yet'}
            description={search ? undefined : 'Tap + to write your first note.'}
          />
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mb-4">
              <SectionHeader title={group.label} />
              {density === 'card' ? (
                <div className="flex flex-col gap-2">
                  {group.notes.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note}
                      collection={
                        note.collectionId ? collectionById.get(note.collectionId) : undefined
                      }
                      density={density}
                      onOpen={(n) => navigate(`/notes/${n.id}`)}
                      onTogglePin={(n) => void handleTogglePin(n)}
                      onDuplicate={(n) => void handleDuplicate(n)}
                      onDelete={(n) => void handleDelete(n)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  {group.notes.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note}
                      collection={
                        note.collectionId ? collectionById.get(note.collectionId) : undefined
                      }
                      density={density}
                      onOpen={(n) => navigate(`/notes/${n.id}`)}
                      onTogglePin={(n) => void handleTogglePin(n)}
                      onDuplicate={(n) => void handleDuplicate(n)}
                      onDelete={(n) => void handleDelete(n)}
                    />
                  ))}
                </Card>
              )}
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        aria-label="New note"
        onClick={() => navigate('/notes/new')}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
        style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-floating)' }}
      >
        +
      </button>
    </div>
  )
}
