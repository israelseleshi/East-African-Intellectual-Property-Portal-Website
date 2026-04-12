"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup, FieldError } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import AuthLayout from "@/components/AuthLayout"
import { VerifyOtpPageSkeleton } from "@/components/AuthPageSkeleton"

const otpSchema = z.object({
  otp: z.string().length(6, "Please enter the complete 6-digit code").regex(/^\d+$/, "OTP must contain only numbers"),
})

type OtpFormData = z.infer<typeof otpSchema>

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

const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const email = useAuthStore((state) => state.email)
  const setSignupEmail = useAuthStore((state) => state.setSignupEmail)
  const login = useAuthStore((state) => state.login)
  
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!email) {
      navigate("/signup")
    }
  }, [email, navigate])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length > 1) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError(null)
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) {
      setError("OTP must contain only numbers")
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    
    const newOtp = pastedData.split("").concat(Array(6).fill("")).slice(0, 6)
    setOtp(newOtp)
    setError(null)
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const otpValue = otp.join("")
    
    const result = otpSchema.safeParse({ otp: otpValue })
    if (!result.success) {
      setError(result.error.issues[0].message)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    if (!email) {
      toast.error("Email not found. Please sign up again.")
      navigate("/signup")
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.verifyOtp({ email, otp: otpValue })
      setSignupEmail("")
      login(response.user)
      toast.success("Account verified successfully!")
      navigate("/")
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      const errorMsg = error.response?.data?.message || "Invalid or expired verification code"
      setError(errorMsg)
      setShake(true)
      setTimeout(() => setShake(false), 400)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email || resendTimer > 0) return

    setIsLoading(true)
    try {
      await authApi.register({
        fullName: "",
        email,
        password: ""
      })
      toast.success("New verification code sent! Please check your email.")
      setResendTimer(60)
      setOtp(["", "", "", "", "", ""])
      setError(null)
      inputRefs.current[0]?.focus()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to resend code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isPageLoading) {
    return (
      <AuthLayout>
        <VerifyOtpPageSkeleton />
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
                <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
              </motion.div>
              <motion.div variants={itemVariants}>
                <CardDescription>
                  We've sent a 6-digit verification code to<br />
                  <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-6"
                variants={itemVariants}
              >
                <motion.div
                  animate={shake ? "shake" : ""}
                  variants={shakeVariants}
                >
                  <Field className="gap-2" data-invalid={!!error}>
                    <Label className="sr-only">Verification Code</Label>
                    <div className="flex justify-center gap-2" onPaste={handlePaste}>
                      {otp.map((digit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          whileFocus={{ scale: 1.1 }}
                        >
                          <Input
                            ref={(el) => { inputRefs.current[index] = el }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={handleChange(index)}
                            onKeyDown={handleKeyDown(index)}
                            className="size-12 text-center text-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                            disabled={isLoading}
                            aria-invalid={!!error}
                          />
                        </motion.div>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex justify-center mt-2"
                        >
                          <FieldError>{error}</FieldError>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Field>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="size-4" />
                        </motion.span>
                        <span>Verifying...</span>
                      </span>
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </motion.div>
              </motion.form>
              
              <motion.div 
                className="relative my-6"
                variants={itemVariants}
              >
                <Separator />
              </motion.div>
              
              <motion.div 
                className="text-center text-sm text-muted-foreground"
                variants={itemVariants}
              >
                Didn't receive the code?{" "}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block"
                >
                  <Button
                    variant="link"
                    className="px-0 h-auto"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || isLoading}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
            <CardFooter className="justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="link" className="px-0 h-auto text-sm" asChild>
                  <Link to="/signup">Change email</Link>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </AuthLayout>
  )
}
