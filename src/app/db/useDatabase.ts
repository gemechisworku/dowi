import { useContext } from 'react'
import { DatabaseContext, type DatabaseContextValue } from './DatabaseContext'

export function useDatabase(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabase must be used within a DatabaseProvider')
  return ctx
}
