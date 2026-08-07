import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { validateEmail } from '@/lib/validation';

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    const eErr = validateEmail(email);
    if (eErr) { setError(eErr); return; }
    setError(null);
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
      if (resendError) throw resendError;
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Verify your email" subtitle="We sent a verification link to your email address. Click the link to activate your account.">
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-accent/30 bg-accent/5 text-accent">
            <Mail className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            Once you've clicked the verification link in your email, you can sign in to your account.
          </p>
        </div>

        {sent && (
          <Alert variant="success">
            Verification link sent. Please check your inbox and click the link to activate your account.
          </Alert>
        )}

        <div className="border-t border-border pt-6">
          <p className="mb-4 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Didn't receive an email?</p>
          <form onSubmit={handleResend} className="space-y-4">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              error={error}
              icon={<Mail className="h-4 w-4" />}
              placeholder="you@example.com"
            />
            <Button type="submit" fullWidth loading={loading} disabled={sent}>
              {sent ? 'Email Sent' : 'Resend Verification Email'}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" fullWidth onClick={() => navigate('/login')}>
            <CheckCircle className="h-4 w-4" />
            I've Verified My Email
          </Button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
