import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { supabase } from '@/lib/supabase';
import { DEV_TEST_ACCOUNTS } from '@/lib/constants';
import { validateEmail } from '@/lib/validation';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    const eErr = validateEmail(email);
    if (eErr) { setEmailError(eErr); return; }
    setEmailError(null);
    if (!password) { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          setNeedsVerification(true);
          setError('Email verification is required before you can sign in. Please check your inbox for the verification link.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
        return;
      }
      if (!data.session) setError('Login failed. Please try again.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setLoading(true);
    await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    setLoading(false);
    setError('Verification email sent. Please check your inbox.');
  }

  async function quickLogin(devEmail: string, devPassword: string) {
    setLoading(true);
    setError(null);
    setEmail(devEmail);
    setPassword(devPassword);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });
    if (signInError) setError(signInError.message);
    setLoading(false);
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your WhittleScript account.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
          error={emailError}
          icon={<Mail className="h-4 w-4" />}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={null}
          icon={<Lock className="h-4 w-4" />}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="font-mono text-2xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot Password?
          </button>
        </div>

        {error && (
          <Alert variant={needsVerification ? 'warning' : 'error'}>
            {error}
            {needsVerification && (
              <div className="mt-3">
                <Button type="button" variant="outline" size="sm" onClick={resendVerification} loading={loading}>
                  Resend Verification Email
                </Button>
              </div>
            )}
          </Alert>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign In
        </Button>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-6 border border-dashed border-border p-4">
          <p className="mb-3 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
            Development test accounts (click to sign in):
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEV_TEST_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => quickLogin(acc.email, acc.password)}
                className="border border-border bg-surface px-3 py-2 font-mono text-2xs uppercase tracking-wider text-foreground transition-colors hover:bg-surface-hover"
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button onClick={() => navigate('/create-account')} className="font-medium text-primary underline-offset-2 hover:underline">
          Create Account
        </button>
      </p>
    </AuthLayout>
  );
}
