"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Eye, EyeOff, Sun, Moon } from "lucide-react"

export default function SignUpPage() {
  const navigate = useNavigate()
  const setSignupEmail = useAuthStore((state) => state.setSignupEmail)
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    firmName: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('eai.theme')
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('eai.theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters")
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
      toast.success("Verification code sent to your email")
      navigate("/verify-otp")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-auto">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-md border bg-background hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>
      
      {/* Logo */}
      <div className="absolute top-4 left-4">
        <img
          src="/eaip-logo.png"
          alt="EAIP Logo"
          className="h-12 w-auto object-contain"
        />
      </div>
      
      <Card className="w-full max-w-md my-4 rounded-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange("fullName")}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange("phone")}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Label htmlFor="firmName">Firm Name (optional)</Label>
                <Input
                  id="firmName"
                  type="text"
                  placeholder="Enter your firm name"
                  value={formData.firmName}
                  onChange={handleChange("firmName")}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange("password")}
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              <Field>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  disabled={isLoading}
                />
              </Field>
            </FieldGroup>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          
          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              Or
            </span>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" className="px-0 h-auto" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}