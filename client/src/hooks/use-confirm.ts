"use client"

import * as React from "react"

type ConfirmOptions = {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
}

type ConfirmState = {
  isOpen: boolean
  options: ConfirmOptions
  resolve: ((value: boolean) => void) | null
}

const initialState: ConfirmState = {
  isOpen: false,
  options: {},
  resolve: null,
}

function useConfirm() {
  const [state, setState] = React.useState<ConfirmState>(initialState)

  const confirm = React.useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const dialog = {
    isOpen: state.isOpen,
    options: state.options,
    onConfirm: () => {
      if (state.resolve) {
        state.resolve(true)
      }
      setState(initialState)
    },
    onCancel: () => {
      if (state.resolve) {
        state.resolve(false)
      }
      setState(initialState)
    },
  }

  return { confirm, dialog }
}

export { useConfirm }