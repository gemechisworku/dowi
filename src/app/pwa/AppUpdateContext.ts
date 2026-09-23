import { createContext } from 'react'

export interface AppUpdateContextValue {
  needRefresh: boolean
  dismiss: () => void
  updateApp: () => void
}

export const AppUpdateContext = createContext<AppUpdateContextValue | null>(null)
