"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldError } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import AuthLayout from "@/components/AuthLayout"
import { ForgotPasswordPageSkeleton } from "@/components/AuthPageSkeleton"

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

type Step = 'email' | 'otp' | 'success'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setErrors({ email: "Email is required" })
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Please enter a valid email address" })
      return false
    }
    setErrors({})
    return true
  }

  const validateOtp = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!otp.trim()) {
      newErrors.otp = "OTP is required"
    } else if (!/^\d{6}$/.test(otp)) {
      newErrors.otp = "OTP must be 6 digits"
    }
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail()) return

    setIsLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setStep('otp')
      toast.success("Reset code sent to your email")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateOtp()) return

    setIsLoading(true)
    try {
      await authApi.resetPassword({ email, otp, password })
      setStep('success')
      toast.success("Password reset successfully")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Something went wrong. Please try again.")
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
                <CardTitle className="text-2xl font-bold">
                  {step === 'success' ? 'Password Reset Complete' : 'Forgot Password'}
                </CardTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <CardDescription>
                  {step === 'email' && "Enter your email to receive a reset code"}
                  {step === 'otp' && "Enter the code sent to your email and create a new password"}
                  {step === 'success' && "Your password has been reset successfully"}
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent>
              <AnimatePresence mode="wait">
                {step === 'email' && (
                  <motion.form
                    key="email-form"
                    onSubmit={handleSendOtp}
                    className="space-y-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Field className="gap-2" data-invalid={!!errors.email}>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (errors.email) setErrors({ ...errors, email: '' })
                        }}
                        disabled={isLoading}
                      />
                      <AnimatePresence>
                        {errors.email && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <FieldError>{errors.email}</FieldError>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Field>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Sending..." : "Send Reset Code"}
                    </Button>
                  </motion.form>
                )}

                {step === 'otp' && (
                  <motion.form
                    key="otp-form"
                    onSubmit={handleResetPassword}
                    className="space-y-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Field className="gap-2" data-invalid={!!errors.otp}>
                      <Label htmlFor="otp">Reset Code</Label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setOtp(val)
                          if (errors.otp) setErrors({ ...errors, otp: '' })
                        }}
                        disabled={isLoading}
                        className="text-center text-xl tracking-[0.3em] font-mono"
                      />
                      <AnimatePresence>
                        {errors.otp && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <FieldError>{errors.otp}</FieldError>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Field>

                    <Field className="gap-2" data-invalid={!!errors.password}>
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          if (errors.password) setErrors({ ...errors, password: '' })
                        }}
                        disabled={isLoading}
                      />
                      <AnimatePresence>
                        {errors.password && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <FieldError>{errors.password}</FieldError>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Field>

                    <Field className="gap-2" data-invalid={!!errors.confirmPassword}>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                        }}
                        disabled={isLoading}
                      />
                      <AnimatePresence>
                        {errors.confirmPassword && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <FieldError>{errors.confirmPassword}</FieldError>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Field>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Resetting..." : "Reset Password"}
                    </Button>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={() => setStep('email')}
                        disabled={isLoading}
                      >
                        Didn't receive the code? Send again
                      </Button>
                    </div>
                  </motion.form>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    className="text-center py-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground">
                      Your password has been reset successfully.<br />
                      You can now sign in with your new password.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="justify-center">
              <motion.div 
                className="text-center text-sm text-muted-foreground"
                variants={itemVariants}
              >
                Remember your password?{" "}
                <Button variant="link" className="px-0 h-auto" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </AuthLayout>
  )
}
