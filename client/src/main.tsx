import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './app/router'
import { ToastProvider } from './components/ui/toast'
import { ConfirmDialogProvider } from './components/ui/confirm-dialog'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmDialogProvider>
        <RouterProvider router={router} />
      </ConfirmDialogProvider>
    </ToastProvider>
  </React.StrictMode>
)
