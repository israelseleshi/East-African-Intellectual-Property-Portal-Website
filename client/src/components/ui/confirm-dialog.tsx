import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "primary"
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "bg-[var(--eai-surface)] border border-[var(--eai-border)] shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                variant === "danger" ? "bg-[var(--eai-critical)]/10 text-[var(--eai-critical)]" : "bg-[var(--eai-primary)]/10 text-[var(--eai-primary)]"
              )}>
                <WarningCircle size={20} weight="fill" />
              </div>
              <div className="flex-1">
                <DialogPrimitive.Title className="text-[16px] font-bold text-[var(--eai-text)]">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-[13px] text-[var(--eai-text-secondary)] mt-1">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-[13px] font-bold text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onOpenChange(false)
                }}
                className={cn(
                  "px-4 py-2 text-[13px] font-bold text-white transition-colors",
                  variant === "danger"
                    ? "bg-[var(--eai-critical)] hover:bg-[var(--eai-critical)]/90"
                    : "bg-[var(--eai-primary)] hover:bg-[var(--eai-primary)]/90"
                )}
              >
                {confirmText}
              </button>
            </div>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors">
            <X size={16} weight="bold" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean
    title: string
    description?: string
    onConfirm: () => void
    variant?: "danger" | "primary"
  }>({
    open: false,
    title: "",
    onConfirm: () => {},
  })

  const confirm = React.useCallback((options: Omit<typeof state, "open">) => {
    setState({ ...options, open: true })
  }, [])

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      title={state.title}
      description={state.description}
      onConfirm={state.onConfirm}
      variant={state.variant}
    />
  )

  return { confirm, dialog }
}
