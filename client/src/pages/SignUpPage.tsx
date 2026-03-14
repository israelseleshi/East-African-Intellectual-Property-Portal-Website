import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Eye, EyeSlash, Envelope, Phone, Building } from '@phosphor-icons/react';
import { api } from '../utils/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from '@/store/authStore';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    firmName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setSignupEmail = useAuthStore((state) => state.setSignupEmail);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        firmName: formData.firmName,
        password: formData.password
      });
      setSignupEmail(formData.email);
      navigate('/verify-otp');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--eai-bg)] p-4 font-sans overflow-y-auto py-12">
      <div className="w-full max-w-[420px] space-y-8 my-auto">
        <div className="text-center space-y-4">
          <img src="/eaip-logo.png" alt="EAIP Logo" className="mx-auto h-20 w-auto" />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--eai-text)]">Create Account</h1>
            <p className="text-[15px] font-medium text-[var(--eai-text-secondary)]">Join the TPMS Legal Practice System</p>
          </div>
        </div>

        <Card className="border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-[var(--eai-surface)] rounded-xl overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center space-y-0.5">
            <CardTitle className="text-lg font-semibold text-[var(--eai-text)]">Register Your Firm</CardTitle>
            <CardDescription className="text-sm text-[var(--eai-text-secondary)]">Fill in the details below to get started</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-3.5 text-[13px] font-semibold text-red-600 dark:text-red-400 border border-red-100/50 dark:border-red-800/50 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

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

              <div className="space-y-1">
                <Label className="text-sm font-semibold text-[var(--eai-text)] ml-1 flex items-center gap-2">
                  <Lock size={18} weight="bold" className="text-[var(--eai-text-secondary)]" />
                  Password
                </Label>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
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
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[var(--eai-primary)] hover:bg-[var(--eai-primary-hover)] text-white rounded-xl text-[15px] font-bold transition-all active:scale-[0.98] shadow-lg shadow-[var(--eai-primary)]/20"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    CREATING ACCOUNT...
                  </span>
                ) : 'Create account'}
              </Button>
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
  );
}
