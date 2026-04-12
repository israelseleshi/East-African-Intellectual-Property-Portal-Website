"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label, RequiredLabel } from "@/components/ui/label"
import { Field, FieldGroup, FieldError } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Typography } from "@/components/ui/typography"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import AuthLayout from "@/components/AuthLayout"
import { SignUpPageSkeleton } from "@/components/AuthPageSkeleton"

const STEPS = [
  { id: "account", label: "Account", description: "Basic info" },
  { id: "contact", label: "Contact", description: "Optional details" },
  { id: "security", label: "Security", description: "Password" },
] as const

const step1Schema = z.object({
  fullName: z.string().min(1, "Full name is required").min(2, "Full name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
})

const step3Schema = z.object({
  password: z.string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

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

const stepVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
}

const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const setSignupEmail = useAuthStore((state) => state.setSignupEmail)

  const [isPageLoading, setIsPageLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    firmName: "",
    password: "",
    confirmPassword: ""
  })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateStep = (step: number): boolean => {
    if (step === 0) {
      const result = step1Schema.safeParse({ fullName: formData.fullName, email: formData.email })
      if (!result.success) {
        const fieldErrors: Partial<Record<string, string>> = {}
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message
          }
        }
        setErrors(fieldErrors)
        setShake(true)
        setTimeout(() => setShake(false), 400)
        return false
      }
      setErrors({})
      return true
    }
    if (step === 2) {
      const result = step3Schema.safeParse({ password: formData.password, confirmPassword: formData.confirmPassword })
      if (!result.success) {
        const fieldErrors: Partial<Record<string, string>> = {}
        for (const issue of result.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message
          }
        }
        setErrors(fieldErrors)
        setShake(true)
        setTimeout(() => setShake(false), 400)
        return false
      }
      setErrors({})
      return true
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setDirection(1)
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  const prevStep = () => {
    setDirection(-1)
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep(2)) {
      return
    }

    setIsLoading(true)
    try {
      await authApi.register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        firmName: formData.firmName || undefined,
        password: formData.password
      })
      setSignupEmail(formData.email)
      toast.success("Account created! Verification code sent to your email.")
      navigate("/verify-otp")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const isStepComplete = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0:
        return !!formData.fullName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
      case 1:
        return true
      case 2:
        return formData.password.length >= 8 && formData.password === formData.confirmPassword
      default:
        return false
    }
  }

  if (isPageLoading) {
    return (
      <AuthLayout>
        <SignUpPageSkeleton />
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
          <Card className="w-full my-4 rounded-xl shadow-lg">
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
            <CardHeader className="space-y-1 text-center pb-2">
              <motion.div variants={itemVariants}>
                <Typography.h1a>Create an account</Typography.h1a>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Typography.muted>
                  Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].description}
                </Typography.muted>
              </motion.div>
            </CardHeader>

            <motion.div className="px-6" variants={itemVariants}>
              <Progress value={progress} className="h-2" />
            </motion.div>

            <CardContent className="pt-6">
              <motion.div 
                className="flex items-center justify-center gap-2 mb-6"
                variants={itemVariants}
              >
                {STEPS.map((step, index) => (
                    <motion.div
                      key={step.id}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        transition: { delay: index * 0.1 }
                      }}
                    >
                      <motion.div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                          index < currentStep
                            ? "bg-green-500 text-white"
                            : index === currentStep
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        animate={index === currentStep ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {index < currentStep ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <Check className="h-4 w-4" />
                          </motion.div>
                        ) : (
                          index + 1
                        )}
                      </motion.div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        index <= currentStep ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.description}
                    </span>
                    {index < STEPS.length - 1 && (
                      <motion.div
                        className={`h-px w-8 sm:w-12 ${
                          index < currentStep ? "bg-green-500" : "bg-muted"
                        }`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: index < currentStep ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ originX: 0 }}
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>

              <form onSubmit={handleSubmit}>
                <div className="min-h-[200px] relative overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      {currentStep === 0 && (
                        <FieldGroup>
                          <motion.div animate={shake ? "shake" : ""} variants={shakeVariants}>
                            <Field className="gap-2" data-invalid={!!errors.fullName}>
                              <RequiredLabel htmlFor="fullName">Full Name *</RequiredLabel>
                              <motion.div whileFocus={{ scale: 1.01 }}>
                                <Input
                                  id="fullName"
                                  type="text"
                                  placeholder="Enter your full name"
                                  value={formData.fullName}
                                  onChange={handleChange("fullName")}
                                  disabled={isLoading}
                                  aria-invalid={!!errors.fullName}
                                  className="transition-all duration-200"
                                />
                              </motion.div>
                              <AnimatePresence mode="wait">
                                {errors.fullName && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <FieldError>{errors.fullName}</FieldError>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Field>
                          </motion.div>
                          <motion.div animate={shake ? "shake" : ""} variants={shakeVariants}>
                            <Field className="gap-2" data-invalid={!!errors.email}>
                              <RequiredLabel htmlFor="email">Email *</RequiredLabel>
                              <motion.div whileFocus={{ scale: 1.01 }}>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="Enter your email"
                                  value={formData.email}
                                  onChange={handleChange("email")}
                                  disabled={isLoading}
                                  aria-invalid={!!errors.email}
                                  className="transition-all duration-200"
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
                        </FieldGroup>
                      )}

                      {currentStep === 1 && (
                        <FieldGroup>
                          <Field className="gap-2">
                            <Label htmlFor="phone">Phone (optional)</Label>
                            <motion.div whileFocus={{ scale: 1.01 }}>
                              <Input
                                id="phone"
                                type="tel"
                                placeholder="Enter your phone number"
                                value={formData.phone}
                                onChange={handleChange("phone")}
                                disabled={isLoading}
                                className="transition-all duration-200"
                              />
                            </motion.div>
                          </Field>
                          <Field className="gap-2">
                            <Label htmlFor="firmName">Firm Name (optional)</Label>
                            <motion.div whileFocus={{ scale: 1.01 }}>
                              <Input
                                id="firmName"
                                type="text"
                                placeholder="Enter your firm name"
                                value={formData.firmName}
                                onChange={handleChange("firmName")}
                                disabled={isLoading}
                                className="transition-all duration-200"
                              />
                            </motion.div>
                          </Field>
                        </FieldGroup>
                      )}

                      {currentStep === 2 && (
                        <FieldGroup>
                          <motion.div animate={shake ? "shake" : ""} variants={shakeVariants}>
                            <Field className="gap-2" data-invalid={!!errors.password}>
                              <RequiredLabel htmlFor="password">Password *</RequiredLabel>
                              <div className="relative">
                                <motion.div whileFocus={{ scale: 1.01 }}>
                                  <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange("password")}
                                    className="pr-10 transition-all duration-200"
                                    disabled={isLoading}
                                    aria-invalid={!!errors.password}
                                  />
                                </motion.div>
                                <motion.button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  tabIndex={-1}
                                >
                                  {showPassword ? (
                                    <EyeOff className="size-4" />
                                  ) : (
                                    <Eye className="size-4" />
                                  )}
                                </motion.button>
                              </div>
                              <AnimatePresence mode="wait">
                                {errors.password && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <FieldError>{errors.password}</FieldError>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Field>
                          </motion.div>
                          <motion.div animate={shake ? "shake" : ""} variants={shakeVariants}>
                            <Field className="gap-2" data-invalid={!!errors.confirmPassword}>
                              <RequiredLabel htmlFor="confirmPassword">Confirm Password *</RequiredLabel>
                              <div className="relative">
                                <motion.div whileFocus={{ scale: 1.01 }}>
                                  <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange("confirmPassword")}
                                    className="pr-10 transition-all duration-200"
                                    disabled={isLoading}
                                    aria-invalid={!!errors.confirmPassword}
                                  />
                                </motion.div>
                                <motion.button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="size-4" />
                                  ) : (
                                    <Eye className="size-4" />
                                  )}
                                </motion.button>
                              </div>
                              <AnimatePresence mode="wait">
                                {errors.confirmPassword && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <FieldError>{errors.confirmPassword}</FieldError>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Field>
                          </motion.div>
                        </FieldGroup>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <motion.div 
                  className="flex items-center justify-between mt-6"
                  variants={itemVariants}
                >
                  {currentStep > 0 ? (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={isLoading}
                      >
                        <ArrowLeft className="size-4 mr-2" />
                        Back
                      </Button>
                    </motion.div>
                  ) : (
                    <div />
                  )}

                  {currentStep < STEPS.length - 1 ? (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={isLoading}
                      >
                        Next
                        <ArrowRight className="size-4 ml-2" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    >
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Loader2 className="size-4 mr-2" />
                            </motion.span>
                            Creating account...
                          </>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </form>

              <motion.div 
                className="relative my-6"
                variants={itemVariants}
              >
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  Or
                </span>
              </motion.div>

              <motion.div 
                className="text-center"
                variants={itemVariants}
              >
                <Typography.muted>
                  Already have an account?{" "}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button variant="link" className="px-0 h-auto" asChild>
                      <Link to="/login">Sign in</Link>
                    </Button>
                  </motion.div>
                </Typography.muted>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AuthLayout>
  )
}
