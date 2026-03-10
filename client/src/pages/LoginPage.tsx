import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Lock, User, Eye, EyeSlash } from '@phosphor-icons/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      login(response.data.user);

      // Handle redirection after login
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo') || '/';
      navigate(returnTo);
    } catch (err: unknown) {
      let errorMsg = 'Login failed';
      const error = err as { response?: { status?: number; data?: { message?: string } }; request?: unknown; message?: string };

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        if (status === 404) {
          errorMsg = `API Endpoint Not Found (404). The backend server may not be running or the route is misconfigured.`;
        } else if (status === 401) {
          errorMsg = data?.message || 'Invalid email or password';
        } else if (status === 403) {
          errorMsg = data?.message || 'Account not verified or access denied';
        } else if (status === 500) {
          errorMsg = `Server Error (500). Please try again later.`;
        } else {
          errorMsg = data?.message || `Server error: ${status}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMsg = 'Cannot connect to server. Please check your internet connection or the API may be down.';
      } else {
        // Something else happened
        errorMsg = error.message || 'An unexpected error occurred';
      }

      setError(errorMsg);
      console.error('Login error details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--eai-bg)] p-4 font-sans">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-4">
          <img src="/eaip-logo.png" alt="EAIP Logo" className="mx-auto h-20 w-auto" />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--eai-text)]">TPMS Login</h1>
            <p className="text-[15px] font-medium text-[var(--eai-text-secondary)]">Legal Practice Management System</p>
          </div>
        </div>

        <Card className="border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] bg-[var(--eai-surface)] rounded-xl overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center space-y-0.5">
            <CardTitle className="text-lg font-semibold text-[var(--eai-text)]">Welcome Back</CardTitle>
            <CardDescription className="text-sm text-[var(--eai-text-secondary)]">Sign in to access your dashboard</CardDescription>
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
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
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
                    LOGGING IN...
                  </span>
                ) : 'Log in to dashboard'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pb-8 flex flex-col space-y-4 items-center border-t border-[var(--eai-border)]">
            <p className="text-sm text-[var(--eai-text-secondary)]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[var(--eai-primary)] font-semibold hover:underline underline-offset-4">
                Sign Up
              </Link>
            </p>
            <p className="text-[11px] font-bold text-[var(--eai-text-secondary)] tracking-widest opacity-60">
              Authorized legal access only
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
