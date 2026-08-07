import { useState } from 'react';
import { Mail, User, Lock, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Alert } from '@/components/ui/Alert';
import { COUNTRIES } from '@/lib/constants';
import {
  validateUsername,
  validateEmail,
  validateEmailsMatch,
  validatePassword,
  validatePasswordsMatch,
  validateDateOfBirth,
  validateRequired,
} from '@/lib/validation';
import { supabase } from '@/lib/supabase';

interface ReaderWriterFormProps {
  onSubmit: (data: AccountFormData) => Promise<void>;
  loading: boolean;
  submitError: string | null;
}

export interface AccountFormData {
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
  country: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export function ReaderWriterForm({ onSubmit, loading, submitError }: ReaderWriterFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    country: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checking, setChecking] = useState(false);

  function update<K extends keyof typeof formData>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
    if (key === 'username') setUsernameTaken(false);
    if (key === 'email' || key === 'confirmEmail') setEmailTaken(false);
  }

  async function checkUnique(username: string, email: string) {
    setChecking(true);
    const checks: Array<() => Promise<void>> = [];
    if (username) {
      checks.push(async () => {
        const { data } = await supabase.from('profiles').select('id').eq('username', username.trim()).maybeSingle();
        if (data) setUsernameTaken(true);
      });
    }
    if (email) {
      checks.push(async () => {
        const { data } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
        if (data) setEmailTaken(true);
      });
    }
    await Promise.all(checks.map((fn) => fn()));
    setChecking(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string | null> = {
      username: validateUsername(formData.username),
      email: validateEmail(formData.email),
      confirmEmail: validateEmailsMatch(formData.email, formData.confirmEmail),
      password: validatePassword(formData.password),
      confirmPassword: validatePasswordsMatch(formData.password, formData.confirmPassword),
      dateOfBirth: validateDateOfBirth(formData.dateOfBirth),
      country: validateRequired(formData.country, 'Country'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (!termsAccepted || !privacyAccepted) return;

    await checkUnique(formData.username, formData.email);
    if (usernameTaken || emailTaken) return;

    await onSubmit({
      username: formData.username.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      dateOfBirth: formData.dateOfBirth,
      country: formData.country,
      termsAccepted,
      privacyAccepted,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Username"
        name="username"
        value={formData.username}
        onChange={(e) => update('username', e.target.value)}
        error={errors.username || (usernameTaken ? 'This username is already taken.' : null)}
        icon={<User className="h-4 w-4" />}
        placeholder="your_username"
        autoComplete="username"
      />
      <Input
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={(e) => update('email', e.target.value)}
        error={errors.email || (emailTaken ? 'An account with this email already exists.' : null)}
        icon={<Mail className="h-4 w-4" />}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Input
        label="Confirm Email Address"
        name="confirmEmail"
        type="email"
        value={formData.confirmEmail}
        onChange={(e) => update('confirmEmail', e.target.value)}
        error={errors.confirmEmail}
        icon={<Mail className="h-4 w-4" />}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={(e) => update('password', e.target.value)}
        error={errors.password}
        icon={<Lock className="h-4 w-4" />}
        placeholder="Create a secure password"
        autoComplete="new-password"
        hint="At least 8 characters with uppercase, lowercase, number and special character."
      />
      <Input
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => update('confirmPassword', e.target.value)}
        error={errors.confirmPassword}
        icon={<Lock className="h-4 w-4" />}
        placeholder="Re-enter your password"
        autoComplete="new-password"
      />
      <Input
        label="Date of Birth"
        name="dateOfBirth"
        type="date"
        value={formData.dateOfBirth}
        onChange={(e) => update('dateOfBirth', e.target.value)}
        error={errors.dateOfBirth}
        icon={<Calendar className="h-4 w-4" />}
      />
      <SearchableSelect
        label="Country"
        value={formData.country}
        onChange={(v) => update('country', v)}
        options={COUNTRIES}
        placeholder="Select your country"
        error={errors.country}
        required
      />

      <div className="space-y-3 pt-2">
        <Checkbox
          checked={termsAccepted}
          onChange={setTermsAccepted}
          label={<>I agree to the <a href="#" className="font-medium text-primary underline-offset-2 hover:underline">Terms of Service</a></>}
        />
        <Checkbox
          checked={privacyAccepted}
          onChange={setPrivacyAccepted}
          label={<>I agree to the <a href="#" className="font-medium text-primary underline-offset-2 hover:underline">Privacy Policy</a></>}
        />
      </div>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <Button type="submit" fullWidth size="lg" loading={loading || checking}>
        Create Account
      </Button>
    </form>
  );
}
