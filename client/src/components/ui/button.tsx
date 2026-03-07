import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--eai-primary)] text-white shadow-lg shadow-[var(--eai-primary)]/20 hover:bg-[var(--eai-primary-hover)]",
        destructive:
          "bg-[var(--eai-critical)] text-white shadow-sm hover:bg-[var(--eai-critical)]/90",
        outline:
          "border border-[var(--eai-border)] bg-transparent shadow-sm hover:bg-[var(--eai-bg)] hover:text-[var(--eai-text)]",
        secondary:
          "bg-[var(--eai-surface)] text-[var(--eai-text)] border border-[var(--eai-border)] shadow-sm hover:bg-[var(--eai-bg)]",
        ghost: "hover:bg-[var(--eai-bg)] hover:text-[var(--eai-text)]",
        link: "text-[var(--eai-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-2xl px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
