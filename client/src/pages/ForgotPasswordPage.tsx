"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { z } from "zod"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldError } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import AuthLayout from "@/components/AuthLayout"
import { ForgotPasswordPageSkeleton } from "@/components/AuthPageSkeleton"

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const fieldVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

const successVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export default function ForgotPasswordPage() {
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [formData, setFormData] = useState<ForgotPasswordFormData>({ email: "" })
  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ email: e.target.value })
    if (errors.email) {
      setErrors({ email: undefined })
    }
  }

  const validateForm = (): boolean => {
    const result = forgotPasswordSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ForgotPasswordFormData, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordFormData
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      await authApi.forgotPassword(formData)
      setIsSubmitted(true)
      toast.success("Password reset instructions sent to your email.")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Failed to send reset instructions. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isPageLoading) {
    return (
      <AuthLayout>
        <ForgotPasswordPageSkeleton />
      </AuthLayout>
    )
  }

  if (isSubmitted) {
    return (
      <AuthLayout>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-md"
        >
          <motion.div variants={cardVariants}>
            <Card className="w-full my-4 rounded-none shadow-lg">
              <motion.div 
                className="flex justify-center pt-6 pb-2"
                variants={itemVariants}
              >
                <motion.img
                  src="/eaip-logo.png"
                  alt="EAIP Logo"
                  className="h-16 w-auto object-contain dark:brightness-0 dark:invert"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.div>
              <CardHeader className="space-y-1 text-center">
                <motion.div variants={itemVariants}>
                  <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <CardDescription>
                    We've sent password reset instructions to<br />
                    <span className="font-medium text-foreground">{formData.email}</span>
                  </CardDescription>
                </motion.div>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div 
                  className="text-center text-sm text-muted-foreground"
                  variants={itemVariants}
                >
                  Didn't receive the email?{" "}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button variant="link" className="px-0 h-auto" onClick={() => setIsSubmitted(false)}>
                      Try again
                    </Button>
                  </motion.div>
                </motion.div>
              </CardContent>
              <CardFooter className="justify-center">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="link" className="px-0 h-auto text-sm" asChild>
                    <Link to="/login">Back to login</Link>
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md"
      >
        <motion.div variants={cardVariants}>
          <Card className="w-full my-4 rounded-none shadow-lg">
            <motion.div 
              className="flex justify-center pt-6 pb-2"
              variants={itemVariants}
            >
              <motion.img
                src="/eaip-logo.png"
                alt="EAIP Logo"
                className="h-16 w-auto object-contain dark:brightness-0 dark:invert"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
            <CardHeader className="space-y-1 text-center">
              <motion.div variants={itemVariants}>
                <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <CardDescription>
                  Enter your email and we'll send you instructions to reset your password
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-4"
                variants={itemVariants}
              >
                <motion.div
                  variants={fieldVariants}
                  custom={0}
                >
                  <Field className="gap-2" data-invalid={!!errors.email}>
                    <Label htmlFor="email">Email</Label>
                    <motion.div whileFocus={{ scale: 1.01 }}>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isLoading}
                        aria-invalid={!!errors.email}
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      />
                    </motion.div>
                    <AnimatePresence mode="wait">
                      {errors.email && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FieldError>{errors.email}</FieldError>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Field>
                </motion.div>
                
                <motion.div 
                  variants={fieldVariants}
                  custom={1}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send reset instructions"}
                  </Button>
                </motion.div>
              </motion.form>
            </CardContent>
            <CardFooter className="justify-center">
              <motion.div 
                className="text-center text-sm text-muted-foreground"
                variants={itemVariants}
              >
                Remember your password?{" "}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block"
                >
                  <Button variant="link" className="px-0 h-auto" asChild>
                    <Link to="/login">Sign in</Link>
                  </Button>
                </motion.div>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </AuthLayout>
  )
}
