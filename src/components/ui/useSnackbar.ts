import { useContext } from 'react'
import { SnackbarContext } from './SnackbarContext'

export function useSnackbar() {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar must be used within a SnackbarProvider')
  return ctx
}
