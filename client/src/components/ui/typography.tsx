import * as React from "react"

const Typography = {
  h1: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h1 ref={ref} className={`scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${className || ''}`} {...props} />
  )),
  h1a: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h1 ref={ref} className={`scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl ${className || ''}`} {...props} />
  )),
  h2: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h2 ref={ref} className={`scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${className || ''}`} {...props} />
  )),
  h2a: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h2 ref={ref} className={`scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0 ${className || ''}`} {...props} />
  )),
  h3: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h3 ref={ref} className={`scroll-m-20 text-2xl font-semibold tracking-tight ${className || ''}`} {...props} />
  )),
  h3a: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h3 ref={ref} className={`scroll-m-20 text-xl font-semibold tracking-tight ${className || ''}`} {...props} />
  )),
  h4: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h4 ref={ref} className={`scroll-m-20 text-xl font-semibold tracking-tight ${className || ''}`} {...props} />
  )),
  h4a: React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h4 ref={ref} className={`scroll-m-20 text-lg font-semibold tracking-tight ${className || ''}`} {...props} />
  )),
  p: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={`leading-7 [&:not(:first-child)]:mt-6 ${className || ''}`} {...props} />
  )),
  pa: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={`text-lg leading-relaxed [&:not(:first-child)]:mt-4 ${className || ''}`} {...props} />
  )),
  pb: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={`text-base leading-relaxed [&:not(:first-child)]:mt-3 ${className || ''}`} {...props} />
  )),
  blockquote: React.forwardRef<HTMLQuoteElement, React.HTMLAttributes<HTMLQuoteElement>>(({ className, ...props }, ref) => (
    <blockquote ref={ref} className={`mt-6 border-l-2 pl-6 italic ${className || ''}`} {...props} />
  )),
  code: React.forwardRef<HTMLPreElement, React.HTMLAttributes<HTMLPreElement>>(({ className, ...props }, ref) => (
    <code ref={ref} className={`relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold ${className || ''}`} {...props} />
  )),
  lead: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={`text-xl text-muted-foreground ${className || ''}`} {...props} />
  )),
  small: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <small ref={ref} className={`text-sm font-medium leading-none ${className || ''}`} {...props} />
  )),
  muted: React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-muted-foreground ${className || ''}`} {...props} />
  )),
}

export { Typography }
