import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLegend, FieldError } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Typography } from "@/components/ui/typography"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import AuthLayout from "@/components/AuthLayout"
import { LoginPageSkeleton } from "@/components/AuthPageSkeleton"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
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

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormData
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.login(formData)
      login(response.user)
      toast.success("Welcome back! Login successful.")
      setTimeout(() => navigate("/"), 100)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  if (isPageLoading) {
    return (
      <AuthLayout>
        <LoginPageSkeleton />
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
                    className="h-16 w-auto object-contain"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.div>
            <CardHeader className="space-y-1 text-center">
              <motion.div
                variants={itemVariants}
              >
                <Typography.h1a>Welcome back</Typography.h1a>
              </motion.div>
              <motion.div
                variants={itemVariants}
              >
                <Typography.muted>
                  Enter your credentials to access your account
                </Typography.muted>
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
                  animate={shake ? "shake" : "visible"}
                >
                  <Field className="gap-2" data-invalid={!!errors.email}>
                    <FieldLegend className="mb-2">Email</FieldLegend>
                    <motion.div
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange("email")}
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
                  animate={shake ? "shake" : "visible"}
                >
                  <Field className="gap-2" data-invalid={!!errors.password}>
                    <div className="flex items-center justify-between">
                      <FieldLegend className="mb-2">Password</FieldLegend>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="link" className="px-0 text-xs h-auto" asChild>
                          <Link to="/forgot-password">Forgot password?</Link>
                        </Button>
                      </motion.div>
                    </div>
                    <div className="relative">
                      <motion.div
                        whileFocus={{ scale: 1.01 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={handleChange("password")}
                          className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                          disabled={isLoading}
                          aria-invalid={!!errors.password}
                        />
                      </motion.div>
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors cursor-pointer hover:text-foreground"
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

                <motion.div variants={fieldVariants} custom={2}>
                  <motion.div
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="size-4" />
                          </motion.span>
                          <span>Signing in...</span>
                        </span>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.form>
              
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
                  Don't have an account?{" "}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button variant="link" className="px-0 h-auto" asChild>
                      <Link to="/signup">Sign up</Link>
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
