import { createContext } from 'react'
import type { DowiDatabase } from '@/db/db'
import type { Repositories } from '@/db/repositories'
import type { NotificationsRepo } from '@/db/notificationsRepo'
import type { SettingsRepo } from '@/db/settingsRepo'

export interface DatabaseContextValue {
  db: DowiDatabase
  repos: Repositories
  settingsRepo: SettingsRepo
  notificationsRepo: NotificationsRepo
}

export const DatabaseContext = createContext<DatabaseContextValue | null>(null)
