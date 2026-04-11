"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

function RequiredLabel({ 
  children, 
  required,
  className,
  ...props 
}: React.ComponentPropsWithoutRef<typeof Label> & { required?: boolean }) {
  const text = typeof children === 'string' ? children : ''
  
  if (!text.includes('*') && !required) {
    return (
      <Label className={className} {...props}>
        {children}
      </Label>
    )
  }

  const parts = text.split('*')
  const hasAsterisk = text.includes('*')
  
  return (
    <Label className={className} {...props}>
      {hasAsterisk ? (
        <>
          {parts[0]}
          <span className="text-red-500 dark:text-red-400">*</span>
          {parts.slice(1).join('*')}
        </>
      ) : (
        <>
          {children}
          {required && <span className="text-red-500 dark:text-red-400"> *</span>}
        </>
      )}
    </Label>
  )
}

export { Label, RequiredLabel }
