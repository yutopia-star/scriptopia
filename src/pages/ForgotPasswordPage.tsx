import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { supabase } from '@/lib/supabase';
import { validateEmail } from '@/lib/validation';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eErr = validateEmail(email);
    if (eErr) { setError(eErr); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (resetError) throw resetError;
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your email and we'll send you a link to reset your password.">
      {sent ? (
        <div className="animate-fade-in text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-success/30 bg-success/5 text-success">
            <CheckCircle className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a password reset link has been sent. Please check your inbox.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/login')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            error={error}
            icon={<Mail className="h-4 w-4" />}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Send Reset Link
          </Button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
