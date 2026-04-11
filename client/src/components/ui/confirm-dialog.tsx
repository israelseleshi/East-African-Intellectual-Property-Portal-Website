"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"

interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  onConfirm: (() => void) | null
}

interface ConfirmDialogContextType {
  confirm: (title: string, description: string) => Promise<boolean>
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider")
  }
  return context
}

interface ConfirmDialogProviderProps {
  children: React.ReactNode
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
  })

  const confirm = useCallback((title: string, description: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        description,
        onConfirm: () => resolve(true),
      })
    })
  }, [])

  const handleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  const handleConfirm = useCallback(() => {
    state.onConfirm?.()
    setState((prev) => ({ ...prev, open: false }))
  }, [state.onConfirm])

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">{state.title}</h2>
            <p className="text-muted-foreground mb-6">{state.description}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}