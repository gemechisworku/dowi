import { useContext } from 'react'
import { AppUpdateContext, type AppUpdateContextValue } from './AppUpdateContext'

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext)
  if (!ctx) throw new Error('useAppUpdate must be used within an AppUpdateProvider')
  return ctx
}
