import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { supabase } from '@/lib/supabase';
import { validatePassword, validatePasswordsMatch } from '@/lib/validation';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pErr = validatePassword(password);
    const mErr = validatePasswordsMatch(password, confirmPassword);
    setPwError(pErr);
    setMatchError(mErr);
    if (pErr || mErr) return;
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch {
      setError('Failed to update password. The reset link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Password Updated" subtitle="Your password has been successfully reset.">
        <div className="animate-fade-in text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-success/30 bg-success/5 text-success">
            <CheckCircle className="h-7 w-7" />
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/login')}>
            Continue to Sign In
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
          error={pwError}
          icon={<Lock className="h-4 w-4" />}
          placeholder="Create a secure password"
          autoComplete="new-password"
          hint="At least 8 characters with uppercase, lowercase, number and special character."
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setMatchError(null); }}
          error={matchError}
          icon={<Lock className="h-4 w-4" />}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Update Password
        </Button>
      </form>
    </AuthLayout>
  );
}
