import type { DowiDatabase } from './db'
import { newId } from '@/lib/id'
import { DEFAULT_SETTINGS } from './settingsRepo'
import type { Category } from './types'

/**
 * Default categories seeded on first run (PRD §5.3). Icons are plain emoji
 * to match CategoryIcon's usage elsewhere — no icon-font dependency.
 */
const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<Category, 'name' | 'icon' | 'color'>> = [
  { name: 'Food', icon: '🍽️', color: 'var(--color-expense)' },
  { name: 'Transport', icon: '🚕', color: 'var(--color-warning)' },
  { name: 'Housing', icon: '🏠', color: 'var(--color-income)' },
  { name: 'Utilities', icon: '💡', color: 'var(--blue-500)' },
  { name: 'Health', icon: '💊', color: 'var(--color-danger-solid)' },
  { name: 'Education', icon: '📚', color: 'var(--blue-700)' },
  { name: 'Shopping', icon: '🛍️', color: 'var(--color-warning)' },
  { name: 'Entertainment', icon: '🎬', color: 'var(--blue-400)' },
  { name: 'Family', icon: '👨‍👩‍👧', color: 'var(--color-income)' },
  { name: 'Other', icon: '📦', color: 'var(--color-text-muted)' },
]

const DEFAULT_INCOME_CATEGORIES: Array<Pick<Category, 'name' | 'icon' | 'color'>> = [
  { name: 'Salary', icon: '💼', color: 'var(--color-income)' },
  { name: 'Freelance', icon: '💻', color: 'var(--blue-500)' },
  { name: 'Business', icon: '🏢', color: 'var(--blue-700)' },
  { name: 'Investment', icon: '📈', color: 'var(--color-income)' },
  { name: 'Gift', icon: '🎁', color: 'var(--color-warning)' },
  { name: 'Other', icon: '📦', color: 'var(--color-text-muted)' },
]

const SEEDED_META_KEY = 'seededAt'

/**
 * Seeds default categories and settings exactly once (idempotent — safe to
 * call on every app start). Uses a meta flag rather than "categories table
 * is empty" so a user who deletes every category doesn't get them silently
 * recreated.
 */
export async function seedIfNeeded(db: DowiDatabase): Promise<void> {
  const already = await db.meta.get(SEEDED_META_KEY)
  if (already) return

  const now = new Date().toISOString()

  await db.transaction('rw', db.categories, db.settings, db.meta, async () => {
    const stillEmpty = !(await db.meta.get(SEEDED_META_KEY))
    if (!stillEmpty) return

    const categoryRecords: Category[] = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        ...c,
        id: newId(),
        type: 'expense' as const,
        createdAt: now,
        updatedAt: now,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
        ...c,
        id: newId(),
        type: 'income' as const,
        createdAt: now,
        updatedAt: now,
      })),
    ]

    await db.categories.bulkAdd(categoryRecords)
    await db.settings.put(DEFAULT_SETTINGS)
    await db.meta.put({ key: SEEDED_META_KEY, value: now })
  })
}
