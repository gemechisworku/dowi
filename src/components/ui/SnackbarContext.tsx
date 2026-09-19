import { createContext } from 'react'

export interface SnackbarAction {
  label: string
  onClick: () => void
}

export interface SnackbarRequest {
  message: string
  action?: SnackbarAction
  /** ms before auto-dismiss. Default 5000 — matches the undo window in PRD AC-M3. */
  duration?: number
}

export interface SnackbarContextValue {
  show: (request: SnackbarRequest) => void
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null)
