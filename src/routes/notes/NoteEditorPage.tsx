import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import type { JSONContent } from '@tiptap/core'
import { useDatabase } from '@/app/db/useDatabase'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { EMPTY_DOC } from './emptyDoc'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useSnackbar } from '@/components/ui/useSnackbar'

// The whole Tiptap dependency tree lives behind this one dynamic import —
// see NoteEditor.tsx's own doc comment. This is the app's first lazy route
// chunk; the initial JS bundle never pays for Tiptap unless a note editor
// actually opens.
const NoteEditor = lazy(() => import('./editor/NoteEditor'))

const AUTOSAVE_DEBOUNCE_MS = 500

const COLOR_OPTIONS = [
  { value: undefined, label: 'None', swatch: 'var(--color-surface-2)' },
  { value: 'var(--color-primary)', label: 'Blue', swatch: 'var(--color-primary)' },
  { value: 'var(--color-income)', label: 'Green', swatch: 'var(--color-income)' },
  { value: 'var(--color-warning)', label: 'Amber', swatch: 'var(--color-warning)' },
  { value: 'var(--color-expense)', label: 'Red', swatch: 'var(--color-expense)' },
] as const

interface DraftSnapshot {
  title: string
  contentJSON: JSONContent
  contentText: string
  collectionId: string
  tags: string[]
  pinned: boolean
  color: string | undefined
}

/**
 * The note editor route (`/notes/new`, `/notes/:id`) — chromeless per
 * `AppLayout`'s routing table, since a rich-text editor genuinely wants the
 * whole viewport rather than sharing it with the top bar/bottom nav (see
 * PLAN.md's M5 "Deviation" note on editor-as-route vs. editor-as-Sheet).
 *
 * Owns note data and the autosave/debounce bookkeeping; the actual Tiptap
 * instance lives in the lazily-loaded `NoteEditor` below. A brand-new note
 * (`/notes/new`) isn't written to the database until the first real edit —
 * `performSave` creates it lazily on that first debounced/flushed save and
 * swaps the URL to `/notes/:id` via a `replace` navigation, so leaving an
 * untouched draft never litters the list with an empty note.
 */
export function NoteEditorPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { repos } = useDatabase()
  const { show } = useSnackbar()
  const collections = useLiveQuery(() => repos.noteCollections.list(), [repos], EMPTY_ARRAY)

  const isNewRoute = id === undefined

  const [title, setTitle] = useState('')
  const [initialContent, setInitialContent] = useState<JSONContent>(EMPTY_DOC)
  const [collectionId, setCollectionId] = useState(searchParams.get('collectionId') ?? '')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [pinned, setPinned] = useState(false)
  const [color, setColor] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [ready, setReady] = useState(isNewRoute)

  // Frozen at mount and never updated afterward — this, not `id` directly,
  // is what the lazy `NoteEditor` below is keyed on. Autosave's
  // create-then-replace flow (see `performSave`) changes the `id` route
  // param under this same mounted instance the moment a brand-new note
  // gets its first real id; keying on `id` itself would make that the
  // exact instant `NoteEditor` remounts with `initialContent` frozen at
  // its stale EMPTY_DOC value, silently discarding everything typed so far
  // from the *visible* editor (the DB write itself still lands correctly,
  // which is what made this so easy to miss — only the live DOM went
  // blank). `handleDuplicate` deliberately doesn't navigate for the same
  // reason.
  const [stableEditorKey] = useState(() => id ?? 'new')

  // Refs, not state — the debounce timer and blur/visibilitychange flush
  // need the *latest* values without re-subscribing effects on every
  // keystroke, and without risking a stale closure (see performSaveRef below).
  const noteIdRef = useRef<string | undefined>(id)
  const dirtyRef = useRef(false)
  const latestRef = useRef<DraftSnapshot>({
    title: '',
    contentJSON: EMPTY_DOC,
    contentText: '',
    collectionId: searchParams.get('collectionId') ?? '',
    tags: [],
    pinned: false,
    color: undefined,
  })
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Loads the existing note exactly once on mount (edit mode only) — a
  // plain fetch, not useLiveQuery, since this page is the only writer of
  // its own note and re-running on every one of its own autosaves would
  // re-seed local state (including the title Input) mid-keystroke.
  useEffect(() => {
    if (initializedRef.current) return
    if (id === undefined) {
      initializedRef.current = true
      return
    }
    let cancelled = false
    repos.notes.get(id).then((found) => {
      if (cancelled || initializedRef.current) return
      initializedRef.current = true
      if (!found) {
        setNotFound(true)
        setReady(true)
        return
      }
      noteIdRef.current = found.id
      setTitle(found.title)
      const content = (found.contentJSON as JSONContent | undefined) ?? EMPTY_DOC
      setInitialContent(content)
      setCollectionId(found.collectionId ?? '')
      setTags(found.tags)
      setPinned(found.pinned)
      setColor(found.color)
      latestRef.current = {
        title: found.title,
        contentJSON: content,
        contentText: found.contentText,
        collectionId: found.collectionId ?? '',
        tags: found.tags,
        pinned: found.pinned,
        color: found.color,
      }
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [id, isNewRoute, repos])

  async function performSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (!dirtyRef.current) return
    const snapshot = latestRef.current
    setStatus('saving')

    const payload = {
      title: snapshot.title,
      contentJSON: snapshot.contentJSON,
      contentText: snapshot.contentText,
      collectionId: snapshot.collectionId || undefined,
      tags: snapshot.tags,
      pinned: snapshot.pinned,
      color: snapshot.color,
    }

    if (noteIdRef.current) {
      await repos.notes.update(noteIdRef.current, payload)
    } else {
      const created = await repos.notes.create(payload)
      noteIdRef.current = created.id
      navigate(`/notes/${created.id}`, { replace: true })
    }
    dirtyRef.current = false
    setStatus('saved')
  }

  // A ref-to-the-latest-function, not a direct dependency, so the
  // blur/visibilitychange listeners (registered once) always flush with
  // current data without needing to re-attach on every render. Assigned in
  // an effect (not during render) per the rules-of-hooks lint — refs are
  // meant to be read/written outside of rendering.
  const performSaveRef = useRef(performSave)
  useEffect(() => {
    performSaveRef.current = performSave
  })

  function scheduleSave() {
    dirtyRef.current = true
    setStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => void performSaveRef.current(), AUTOSAVE_DEBOUNCE_MS)
  }

  // Flush on blur/visibilitychange (PRD AC-N2 — "survives a hard app
  // kill"): the debounce alone would leave up to 500ms of typing
  // unpersisted if the app is killed the instant it's backgrounded, so a
  // tab switch or app-switch away flushes immediately rather than waiting
  // out the timer.
  useEffect(() => {
    function flush() {
      if (saveTimerRef.current) void performSaveRef.current()
    }
    function handleVisibility() {
      if (document.hidden) flush()
    }
    window.addEventListener('blur', flush)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', flush)
      document.removeEventListener('visibilitychange', handleVisibility)
      // Flush on unmount too (navigating away) rather than discarding a
      // pending debounced edit.
      flush()
    }
  }, [])

  function handleTitleChange(value: string) {
    setTitle(value)
    latestRef.current.title = value
    scheduleSave()
  }

  function handleContentChange(json: JSONContent, text: string) {
    latestRef.current.contentJSON = json
    latestRef.current.contentText = text
    scheduleSave()
  }

  function handleCollectionChange(value: string) {
    setCollectionId(value)
    latestRef.current.collectionId = value
    dirtyRef.current = true
    void performSave()
  }

  function handleTogglePin() {
    const next = !pinned
    setPinned(next)
    latestRef.current.pinned = next
    dirtyRef.current = true
    void performSave()
  }

  function handleColorChange(value: string | undefined) {
    setColor(value)
    latestRef.current.color = value
    dirtyRef.current = true
    void performSave()
  }

  function addTag() {
    const trimmed = tagInput.trim()
    setTagInput('')
    if (!trimmed || tags.includes(trimmed)) return
    const next = [...tags, trimmed]
    setTags(next)
    latestRef.current.tags = next
    dirtyRef.current = true
    void performSave()
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    latestRef.current.tags = next
    dirtyRef.current = true
    void performSave()
  }

  async function handleDelete() {
    setConfirmDelete(false)
    const currentId = noteIdRef.current
    if (!currentId) {
      navigate('/notes')
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await repos.notes.remove(currentId)
    navigate('/notes')
    show({
      message: 'Note deleted',
      action: { label: 'Undo', onClick: () => repos.notes.restore(currentId) },
    })
  }

  // Deliberately does *not* navigate to the new copy: this page's
  // `noteIdRef`/`id` param staying put is what keeps the lazy `NoteEditor`
  // below from remounting (see its `key` comment) — swapping to the
  // duplicate's id here would hit the exact same "editor resets to empty"
  // hazard that autosave's own create-then-replace flow works around.
  async function handleDuplicate() {
    await performSave()
    const currentId = noteIdRef.current
    if (!currentId) return
    const original = await repos.notes.get(currentId)
    if (!original) return
    await repos.notes.create({
      title: original.title,
      contentJSON: original.contentJSON,
      contentText: original.contentText,
      collectionId: original.collectionId,
      tags: original.tags,
      pinned: false,
      color: original.color,
    })
    show({ message: 'Note duplicated' })
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <EmptyState
          icon="🔍"
          title="Note not found"
          description="It may have been deleted."
          action={<Button onClick={() => navigate('/notes')}>Back to Notes</Button>}
        />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner label="Opening note" size={28} />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* This screen's own visible "heading" is the title Input below, not
          a styled <h1> — but every other top-level screen has one, and
          axe's page-has-heading-one check expects it here too, so this
          gives screen reader users the same landmark without changing the
          visual design. */}
      <h1 className="sr-only">{isNewRoute ? 'New note' : 'Edit note'}</h1>
      <div
        className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]"
        style={{ background: 'var(--color-bg)' }}
      >
        <IconButton aria-label="Back to Notes" icon="‹" onClick={() => navigate('/notes')} />
        <span
          role="status"
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-xs font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
        <IconButton
          aria-label={pinned ? 'Unpin note' : 'Pin note'}
          aria-pressed={pinned}
          icon={pinned ? '📌' : '📍'}
          variant="ghost"
          onClick={handleTogglePin}
        />
        <IconButton
          aria-label="Duplicate note"
          icon="⧉"
          variant="ghost"
          onClick={() => void handleDuplicate()}
        />
        <IconButton
          aria-label="Delete note"
          icon="🗑️"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 px-4 pb-3">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Title"
          aria-label="Title"
          autoFocus={isNewRoute}
          style={{
            background: 'transparent',
            border: 'none',
            height: 'auto',
            padding: 0,
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Collection"
            value={collectionId}
            onChange={(e) => handleCollectionChange(e.target.value)}
            placeholder="Unfiled"
            options={collections.map((c) => ({ value: c.id, label: c.name }))}
            style={{ height: 36, width: 'auto' }}
          />
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                aria-label={`Colour ${opt.label}`}
                aria-pressed={color === opt.value}
                onClick={() => handleColorChange(opt.value)}
                className="h-7 w-7 rounded-full"
                style={{
                  background: opt.swatch,
                  border: `1.5px solid ${color === opt.value ? 'var(--color-focus-ring)' : 'var(--color-border)'}`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
            >
              #{tag} ×
            </button>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            onBlur={addTag}
            placeholder="Add tag"
            aria-label="Add tag"
            className="min-w-[80px] flex-1 border-none bg-transparent text-xs outline-none"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Spinner label="Loading editor" size={28} />
          </div>
        }
      >
        <NoteEditor
          key={stableEditorKey}
          initialContent={initialContent}
          onChange={handleContentChange}
          autoFocus={!isNewRoute}
        />
      </Suspense>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this note?"
        description="It moves to Trash and can be restored for 30 days."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
