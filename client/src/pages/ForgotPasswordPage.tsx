"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Sun, Moon } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error("Please enter your email")
      return
    }

    setIsLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setIsSubmitted(true)
      toast.success("Password reset instructions sent to your email")
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Failed to send reset instructions")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
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
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to<br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Didn't receive the email?{" "}
              <Button variant="link" className="px-0 h-auto" onClick={() => setIsSubmitted(false)}>
                Try again
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="link" className="px-0 h-auto text-sm" asChild>
              <Link to="/login">Back to login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you instructions to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </Field>
            </FieldGroup>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset instructions"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Button variant="link" className="px-0 h-auto" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}