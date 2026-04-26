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
import { toast } from "@/components/ui/sonner"
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
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempUserId, setTempUserId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")

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
      
      // Check if 2FA is required
      if (response.requires2FA) {
        setRequires2FA(true)
        setTempUserId(response.userId)
        toast.info("Please enter your 2FA code")
        setIsLoading(false)
        return
      }
      
      login(response.user)
      toast.success("Welcome back! Login successful.")
      setTimeout(() => navigate("/"), 100)
    } catch (error: unknown) {
      // Handle axios errors properly
      let status = 0
      let code = ''
      let message = ''
      let rejectionCount = 0
      
      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>
        if (err.response) {
          const res = err.response as { status?: number; data?: Record<string, unknown> }
          status = res.status || 0
          if (res.data) {
            code = (res.data.code as string) || ''
            message = (res.data.message as string) || ''
            const details = res.data.details as Record<string, unknown> | undefined
            rejectionCount = (details?.rejection_count as number) || 0
          }
        }
      }
      
      const remaining = 3 - rejectionCount
      
      console.log('Login error:', { status, code, message, rejectionCount })
      
      if (rejectionCount >= 3) {
        toast.error("Account permanently rejected", { style: { background: '#dc2626', color: '#fff' } })
      } else if (status === 403 || code === 'ACCOUNT_PENDING_APPROVAL') {
        if (rejectionCount > 0) {
          toast.error(`Rejected ${rejectionCount}/3 - ${remaining} attempts left`, { style: { background: '#ea580c', color: '#fff' } })
        } else {
          toast.error("Account pending approval", { style: { background: '#f97316', color: '#fff' } })
        }
      } else if (status === 401 || code === 'INVALID_CREDENTIALS') {
        toast.error(message || "Invalid email or password", { style: { background: '#dc2626', color: '#fff' } })
      } else if (code === 'ACCOUNT_NOT_VERIFIED') {
        toast.error("Please verify your email first", { style: { background: '#dc2626', color: '#fff' } })
      } else {
        toast.error(message || "Login failed", { style: { background: '#dc2626', color: '#fff' } })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!totpCode || totpCode.length !== 6) {
      toast.error("Please enter a 6-digit code")
      return
    }
    if (!tempUserId) {
      toast.error("Session expired. Please login again.")
      setRequires2FA(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.verify2FALogin(tempUserId, totpCode)
      login(response.user)
      toast.success("Welcome back! Login successful.")
      setTimeout(() => navigate("/"), 100)
    } catch (error: unknown) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Invalid code. Try again.", { style: { background: '#dc2626', color: '#fff' } })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset2FA = () => {
    setRequires2FA(false)
    setTempUserId(null)
    setTotpCode("")
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto">
        {/* Left Side - Login Form */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="w-full max-w-md"
        >
          <motion.div variants={cardVariants}>
            <Card className="w-full my-4 rounded-xl shadow-lg border-0 bg-white/80 backdrop-blur-sm">
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
            <CardHeader>
              {requires2FA && (
                <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                  <motion.div variants={itemVariants}>
                    <motion.img
                      src="/google-authenticator-logo.png"
                      alt="Google Authenticator"
                      className="w-12 h-12"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </motion.div>
                  <div>
                    <motion.div variants={itemVariants}>
                      <Typography.h1a className="!mb-1">Two-Factor Authentication</Typography.h1a>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <Typography.lead>Enter the code from your authenticator app</Typography.lead>
                    </motion.div>
                  </div>
                </div>
              )}
              {!requires2FA && (
                <>
                  <motion.div variants={itemVariants}>
                    <Typography.h1a>Welcome back</Typography.h1a>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Typography.lead>Enter your credentials to access your account</Typography.lead>
                  </motion.div>
                </>
              )}
            </CardHeader>
            <CardContent>
              {requires2FA ? (
                <motion.form 
                  onSubmit={handleVerify2FA} 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    variants={fieldVariants}
                    custom={0}
                  >
                    <Field className="gap-2">
                      <FieldLegend className="mb-2">Verification Code</FieldLegend>
                      <Input
                        id="totpCode"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        disabled={isLoading}
                        className="text-center text-2xl tracking-[0.5em]"
                        autoFocus
                      />
                    </Field>
                  </motion.div>

                  <motion.div variants={fieldVariants} custom={1}>
                    <motion.div
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    >
                      <Button 

type="submit" 
                        className="w-full" 
                        disabled={isLoading || totpCode.length !== 6}
                      >
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
                          "Verify & Login"
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form 
                  onSubmit={handleLogin} 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div variants={fieldVariants} custom={0}>
                    <Field data-invalid={!!errors.email}>
                      <FieldLegend>Email</FieldLegend>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        disabled={isLoading}
                        className="h-11"
                      />
                      {errors.email && <FieldError>{errors.email}</FieldError>}
                    </Field>
                  </motion.div>

                  <motion.div variants={fieldVariants} custom={1}>
                    <Field data-invalid={!!errors.password}>
                      <FieldLegend>Password</FieldLegend>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          disabled={isLoading}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {errors.password && <FieldError>{errors.password}</FieldError>}
                    </Field>
                  </motion.div>

                  <motion.div variants={fieldVariants} custom={2}>
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-input" />
                        <span className="text-muted-foreground">Remember me</span>
                      </label>
                      <Button variant="link" size="sm" asChild>
                        <Link to="/forgot-password">Forgot password?</Link>
                      </Button>
                    </div>
                  </motion.div>

                  <motion.div 
                    variants={fieldVariants} 
                    custom={3}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
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
                </motion.form>
              )}
              
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
                <span className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button variant="link" className="px-0 h-auto" asChild>
                      <Link to="/signup">Sign up</Link>
                    </Button>
                  </motion.span>
                </span>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Right Side - Dashboard Preview */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="hidden lg:flex flex-col items-center justify-center"
      >
        <DashboardPreview />
      </motion.div>
    </AuthLayout>
  )
}

function DashboardPreview() {
  const steps = [
    { num: "01", title: "Login", desc: "Enter your credentials" },
    { num: "02", title: "2FA Verify", desc: "Google Authenticator" },
    { num: "03", title: "Dashboard", desc: "Manage trademarks" },
  ]

  return (
    <div className="relative w-full max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-1 shadow-2xl"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.3)'
        }}
      >
        <div className="bg-white/50 rounded-[22px] overflow-hidden">
          {/* Mock Browser Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white/10 rounded-full px-4 py-1 text-xs text-white/60">
                eastafricanip.com
              </div>
            </div>
          </div>

          <div className="flex h-[380px]">
            {/* Sidebar */}
            <div className="w-16 bg-gradient-to-b from-[#1e4b6d] to-[#12334d] p-2 flex flex-col gap-1">
              <div className="w-10 h-10 rounded-lg bg-white/10 mx-auto mb-2" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-10 h-10 rounded-lg mx-auto ${i === 0 ? 'bg-white/20' : 'bg-white/5'}`} />
              ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-4 bg-slate-50">
              {/* Top Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-32 h-6 bg-slate-200 rounded" />
                <div className="w-20 h-6 bg-slate-200 rounded-full" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 mb-2" />
                  <div className="w-16 h-3 bg-slate-200 rounded mb-1" />
                  <div className="w-10 h-2 bg-slate-100 rounded" />
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-green-100 mb-2" />
                  <div className="w-16 h-3 bg-slate-200 rounded mb-1" />
                  <div className="w-10 h-2 bg-slate-100 rounded" />
                </div>
              </div>

              {/* Chart Area */}
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm mb-4 h-24">
                <div className="flex items-end justify-between gap-1 h-full pb-2">
                  {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Recent List */}
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="w-6 h-6 rounded bg-slate-100" />
                    <div className="flex-1">
                      <div className="w-20 h-2 bg-slate-200 rounded mb-1" />
                      <div className="w-12 h-1.5 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-4 mt-6">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/20"
          >
            <span className="w-5 h-5 rounded-full bg-[#1e4b6d] text-white text-[10px] flex items-center justify-center font-medium">
              {step.num}
            </span>
            <span className="text-xs font-medium text-slate-700">{step.title}</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">{step.desc}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
