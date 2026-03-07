import * as React from "react"
import { X, CheckCircle, WarningCircle, Info } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  title: string
  description?: string
  type?: "success" | "error" | "info" | "warning"
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id, duration: toast.duration || 5000 }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle size={20} weight="fill" className="text-[var(--eai-success)]" />,
    error: <WarningCircle size={20} weight="fill" className="text-[var(--eai-critical)]" />,
    warning: <WarningCircle size={20} weight="fill" className="text-[var(--eai-warning)]" />,
    info: <Info size={20} weight="fill" className="text-[var(--eai-primary)]" />,
  }

  const borders = {
    success: "border-l-[var(--eai-success)]",
    error: "border-l-[var(--eai-critical)]",
    warning: "border-l-[var(--eai-warning)]",
    info: "border-l-[var(--eai-primary)]",
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 bg-[var(--eai-surface)] border border-[var(--eai-border)] border-l-4 shadow-lg p-4 min-w-[320px] max-w-[420px] animate-in slide-in-from-right-full duration-300",
        borders[toast.type || "info"]
      )}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type || "info"]}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[var(--eai-text)]">{toast.title}</div>
        {toast.description && (
          <div className="text-[12px] text-[var(--eai-text-secondary)] mt-1">{toast.description}</div>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  )
}
