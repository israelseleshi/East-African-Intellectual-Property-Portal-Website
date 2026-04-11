"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldGroup } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Sun, Moon } from "lucide-react"

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const email = useAuthStore((state) => state.email)
  const setSignupEmail = useAuthStore((state) => state.setSignupEmail)
  const login = useAuthStore((state) => state.login)
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (!email) {
      navigate("/signup")
    }
  }, [email, navigate])

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
    if (!/^\d+$/.test(pastedData)) return
    
    const newOtp = pastedData.split("").concat(Array(6).fill("")).slice(0, 6)
    setOtp(newOtp)
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const otpValue = otp.join("")
    if (otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit code")
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Invalid or expired verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email || resendTimer > 0) return

    try {
      await authApi.register({
        fullName: "",
        email,
        password: ""
      })
      toast.success("New verification code sent!")
      setResendTimer(60)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "Failed to resend code. Please try again.")
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
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to<br />
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <Label className="sr-only">Verification Code</Label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={handleChange(index)}
                      onKeyDown={handleKeyDown(index)}
                      className="size-12 text-center text-lg font-semibold"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </Field>
            </FieldGroup>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </form>
          
          <div className="relative my-6">
            <Separator />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <Button
              variant="link"
              className="px-0 h-auto"
              onClick={handleResend}
              disabled={resendTimer > 0}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="link" className="px-0 h-auto text-sm" asChild>
            <Link to="/signup">Change email</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}