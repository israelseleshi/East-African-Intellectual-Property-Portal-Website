import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from '@/store/authStore';
import { api } from '../utils/api';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const email = useAuthStore((state) => state.email);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d*$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus either the next empty input or the last input
    const nextIndex = Math.min(pastedData.length, 5);
    document.getElementById(`otp-${nextIndex}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otp: otpValue,
      });

      // Store user in auth store (cookies carry tokens)
      useAuthStore.getState().login(
        { id: response.data.user.id, full_name: response.data.user.full_name, email: response.data.user.email, role: response.data.user.role }
      );

      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return <Navigate to="/signup" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--eai-bg)] p-4 font-sans">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-4">
          <img src="/eaip-logo.png" alt="EAIP Logo" className="mx-auto h-20 w-auto" />
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--eai-text)]">Verify Email</h1>
            <p className="text-[15px] font-medium text-[var(--eai-text-secondary)]">Enter the 6-digit code sent to {email}</p>
          </div>
        </div>

        <Card className="border-[var(--eai-border)] shadow-xl shadow-[var(--eai-border)]/50 rounded-none overflow-hidden bg-[var(--eai-surface)]/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6 pt-8 text-center border-b border-[var(--eai-border)]">
            <CardTitle className="text-xl font-bold text-[var(--eai-text)]">Enter Verification Code</CardTitle>
            <CardDescription className="text-[var(--eai-text-secondary)]">We've sent a 6-digit OTP to your email address</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-8 px-8">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 animate-in fade-in slide-in-from-top-1">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium flex items-center">
                    <span className="mr-2">●</span> {error}
                  </p>
                </div>
              )}

              <div className="flex justify-between gap-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    className="w-12 h-14 text-center text-xl font-bold rounded-none border-[var(--eai-border)] focus:border-[var(--eai-primary)] focus:ring-1 focus:ring-[var(--eai-primary)] transition-all bg-[var(--eai-bg)] text-[var(--eai-text)]"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                  />
                ))}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 p-8 pt-4">
              <Button
                type="submit"
                className="w-full h-12 bg-[var(--eai-primary)] hover:bg-[var(--eai-primary-hover)] text-white rounded-none text-[15px] font-bold transition-all active:scale-[0.98] shadow-lg shadow-[var(--eai-primary)]/20"
                disabled={loading}
              >
                {loading ? "VERIFYING..." : "VERIFY CODE"}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--eai-text-secondary)] hover:text-[var(--eai-primary)] transition-colors py-2"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
