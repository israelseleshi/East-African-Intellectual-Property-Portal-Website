"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLegend } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import AuthLayout from "@/components/AuthLayout"
import { motion, AnimatePresence } from "framer-motion"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const }
  }
}

const errorShakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, 0],
    transition: { duration: 0.4 }
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shakeError, setShakeError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Please fill in all fields")
      setShakeError(true)
      setTimeout(() => setShakeError(false), 400)
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.login({ email, password })
      login(response.user)
      toast.success("Welcome back!")
      setTimeout(() => navigate("/"), 100)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Invalid email or password")
      setShakeError(true)
      setTimeout(() => setShakeError(false), 400)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Card className="w-full max-w-md my-4 rounded-none">
          <motion.div variants={itemVariants} className="flex justify-center pt-6 pb-2">
            <motion.img
              src="/eaip-logo.png"
              alt="EAIP Logo"
              className="h-16 w-auto object-contain"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" as const }}
            />
          </motion.div>
          <CardHeader className="space-y-1 text-center">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            </motion.div>
            <motion.div variants={itemVariants}>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              variants={itemVariants}
            >
              <motion.div variants={itemVariants}>
                <FieldGroup>
                  <Field>
                    <FieldLegend>Email</FieldLegend>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLegend>Password</FieldLegend>
                      <Button variant="link" className="px-0 text-xs h-auto" asChild>
                        <Link to="/forgot-password">Forgot password?</Link>
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                </FieldGroup>
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  asChild
                >
                  <motion.span
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          <span>Signing in...</span>
                        </motion.div>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                        >
                          Sign in
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.span>
                </Button>
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
              className="text-center text-sm text-muted-foreground"
              variants={itemVariants}
            >
              Don't have an account?{" "}
              <Button variant="link" className="px-0 h-auto" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}