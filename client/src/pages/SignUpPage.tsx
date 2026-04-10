import { useMemo, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Lock, User, Eye, EyeSlash, Envelope, Phone, Building, ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { api } from '../utils/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

type Step = 1 | 2 | 3 | 4

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    firmName: '',
    password: '',
    confirmPassword: ''
  })
  const [step, setStep] = useState<Step>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const setSignupEmail = useAuthStore((state) => state.setSignupEmail)

  const isSuperAdminRoute = useMemo(() => location.pathname === '/signup/super_admin', [location.pathname])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const goNext = () => {
    setError('')
    if (step === 1 && !formData.fullName.trim()) {
      setError('Full name is required')
      return
    }
    if (step === 2) {
      if (!formData.email.trim()) {
        setError('Email is required')
        return
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required')
        return
      }
    }
    if (step === 3 && !formData.firmName.trim()) {
      setError('Firm name is required')
      return
    }
    setStep((prev) => Math.min(4, prev + 1) as Step)
  }

  const goBack = () => {
    setError('')
    setStep((prev) => Math.max(1, prev - 1) as Step)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        firmName: formData.firmName,
        password: formData.password,
        ...(isSuperAdminRoute ? { role: 'SUPER_ADMIN' } : {})
      })

      setSignupEmail(formData.email)
      navigate('/verify-otp')
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } }
      setError(errorObj.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--eai-bg)] p-4 font-sans overflow-y-auto py-12">
      <div className="w-full max-w-[420px] space-y-8 my-auto">
        <div className="text-center space-y-4">
          <img src="/eaip-logo.png" alt="EAIP Logo" className="mx-auto h-20 w-auto" />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--eai-text)]">Create Account</h1>
            <p className="text-[15px] font-medium text-[var(--eai-text-secondary)]">
              {isSuperAdminRoute ? 'Super Admin onboarding' : 'Join the TPMS Legal Practice System'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={[
                  'h-2 rounded-full transition-all',
                  s <= step ? 'w-8 bg-[var(--eai-primary)]' : 'w-4 bg-[var(--eai-border)]'
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <Card className="border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-[var(--eai-surface)] rounded-xl overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center space-y-0.5">
            <CardTitle className="text-lg font-semibold text-[var(--eai-text)]">Step {step} of 4</CardTitle>
            <CardDescription className="text-sm text-[var(--eai-text-secondary)]">
              {step === 1 && 'Tell us your full name'}
              {step === 2 && 'How can we reach you?'}
              {step === 3 && 'Which firm are you registering?'}
              {step === 4 && 'Set your account password'}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3.5 text-[13px] font-semibold text-red-600 dark:text-red-400 border border-red-100/50 dark:border-red-800/50 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                    <User size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                    Full Name
                  </Label>
                  <Input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                    className="apple-input"
                  />
                </div>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                      <Envelope size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                      className="apple-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                      <Phone size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                      Phone Number
                    </Label>
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Enter your phone number"
                      className="apple-input"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                    <Building size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                    Firm Name
                  </Label>
                  <Input
                    type="text"
                    name="firmName"
                    value={formData.firmName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your firm name"
                    className="apple-input"
                  />
                </div>
              )}

              {step === 4 && (
                <>
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                      <Lock size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                      Password
                    </Label>
                    <div className="relative group">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Create a password"
                        className="apple-input pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors z-10"
                      >
                        {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                      <Lock size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                      Confirm Password
                    </Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                      className="apple-input"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1 || loading}
                  className="apple-button-secondary flex-1"
                >
                  <ArrowLeft size={16} weight="bold" className="mr-2" /> Back
                </Button>

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={loading}
                    className="apple-button-primary flex-1"
                  >
                    Next <ArrowRight size={16} weight="bold" className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="apple-button-primary flex-1"
                  >
                    {loading ? 'CREATING ACCOUNT...' : 'Create account'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>

          <CardFooter className="pb-8 flex flex-col space-y-4 items-center border-t border-[var(--eai-border)]">
            <p className="text-sm text-[var(--eai-text-secondary)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--eai-primary)] font-semibold hover:underline underline-offset-4">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
