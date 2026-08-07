import { useState } from 'react';
import { Mail, User, Lock, Calendar, Globe, Briefcase, Building2, Link as LinkIcon, Film } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import {
  COUNTRIES, INDUSTRY_ROLES, GENRE_OPTIONS, BUDGET_RANGES, PROJECT_TYPES,
} from '@/lib/constants';
import {
  validateUsername, validateEmail, validateEmailsMatch, validatePassword,
  validatePasswordsMatch, validateDateOfBirth, validateRequired, validateUrl,
} from '@/lib/validation';
import { supabase } from '@/lib/supabase';
import type { IndustryAccountType } from '@/types/database';

export interface IndustryFormData {
  username: string;
  email: string;
  password: string;
  dateOfBirth: string;
  country: string;
  accountType: IndustryAccountType;
  fullName: string;
  jobTitle?: string;
  companyName?: string;
  companyWebsite?: string;
  industryRole?: string;
  primaryProfession?: string;
  linkedinUrl?: string;
  imdbUrl?: string;
  personalWebsite?: string;
  portfolioWebsite?: string;
  yearsInIndustry?: number;
  genresOfInterest?: string[];
  preferredBudgetRange?: string;
  projectTypesSeeking?: string[];
  bio?: string;
  city?: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

interface IndustryFormProps {
  accountType: IndustryAccountType;
  onSubmit: (data: IndustryFormData) => Promise<void>;
  loading: boolean;
  submitError: string | null;
}

export function IndustryForm({ accountType, onSubmit, loading, submitError }: IndustryFormProps) {
  const isCompany = accountType === 'company';
  const [form, setForm] = useState({
    username: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    country: '',
    fullName: '',
    jobTitle: '',
    companyName: '',
    companyWebsite: '',
    industryRole: '',
    primaryProfession: '',
    linkedinUrl: '',
    imdbUrl: '',
    personalWebsite: '',
    portfolioWebsite: '',
    yearsInIndustry: '',
    preferredBudgetRange: '',
    bio: '',
    city: '',
  });
  const [genresOfInterest, setGenresOfInterest] = useState<string[]>([]);
  const [projectTypesSeeking, setProjectTypesSeeking] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checking, setChecking] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
    if (key === 'username') setUsernameTaken(false);
    if (key === 'email' || key === 'confirmEmail') setEmailTaken(false);
  }

  function toggleArray(arr: string[], value: string, setter: (v: string[]) => void) {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
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
      username: validateUsername(form.username),
      email: validateEmail(form.email),
      confirmEmail: validateEmailsMatch(form.email, form.confirmEmail),
      password: validatePassword(form.password),
      confirmPassword: validatePasswordsMatch(form.password, form.confirmPassword),
      dateOfBirth: validateDateOfBirth(form.dateOfBirth),
      country: validateRequired(form.country, 'Country'),
      fullName: validateRequired(form.fullName, 'Full name'),
      industryRole: isCompany ? validateRequired(form.industryRole, 'Industry role') : null,
      primaryProfession: !isCompany ? validateRequired(form.primaryProfession, 'Primary profession') : null,
      companyName: isCompany ? validateRequired(form.companyName, 'Company name') : null,
      companyWebsite: isCompany ? validateRequired(form.companyWebsite, 'Company website') || validateUrl(form.companyWebsite) : null,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    if (!termsAccepted || !privacyAccepted) return;

    await checkUnique(form.username, form.email);
    if (usernameTaken || emailTaken) return;

    await onSubmit({
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      dateOfBirth: form.dateOfBirth,
      country: form.country,
      accountType,
      fullName: form.fullName.trim(),
      jobTitle: form.jobTitle.trim() || undefined,
      companyName: form.companyName.trim() || undefined,
      companyWebsite: form.companyWebsite.trim() || undefined,
      industryRole: form.industryRole || undefined,
      primaryProfession: form.primaryProfession || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      imdbUrl: form.imdbUrl.trim() || undefined,
      personalWebsite: form.personalWebsite.trim() || undefined,
      portfolioWebsite: form.portfolioWebsite.trim() || undefined,
      yearsInIndustry: form.yearsInIndustry ? parseInt(form.yearsInIndustry, 10) : undefined,
      genresOfInterest: genresOfInterest.length ? genresOfInterest : undefined,
      preferredBudgetRange: form.preferredBudgetRange || undefined,
      projectTypesSeeking: projectTypesSeeking.length ? projectTypesSeeking : undefined,
      bio: form.bio.trim() || undefined,
      city: form.city.trim() || undefined,
      termsAccepted,
      privacyAccepted,
    });
  }

  const emailLabel = isCompany ? 'Company Email Address' : 'Email Address';
  const emailConfirmLabel = isCompany ? 'Confirm Company Email Address' : 'Confirm Email Address';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Username"
        name="username"
        value={form.username}
        onChange={(e) => update('username', e.target.value)}
        error={errors.username || (usernameTaken ? 'This username is already taken.' : null)}
        icon={<User className="h-4 w-4" />}
        placeholder="your_username"
      />
      <Input
        label="Full Name"
        name="fullName"
        value={form.fullName}
        onChange={(e) => update('fullName', e.target.value)}
        error={errors.fullName}
        icon={<User className="h-4 w-4" />}
        placeholder="Jane Doe"
      />
      {isCompany && (
        <Input
          label="Job Title"
          name="jobTitle"
          value={form.jobTitle}
          onChange={(e) => update('jobTitle', e.target.value)}
          error={errors.jobTitle}
          icon={<Briefcase className="h-4 w-4" />}
          placeholder="Head of Development"
        />
      )}
      {isCompany && (
        <Input
          label="Company Name"
          name="companyName"
          value={form.companyName}
          onChange={(e) => update('companyName', e.target.value)}
          error={errors.companyName}
          icon={<Building2 className="h-4 w-4" />}
          placeholder="Acme Productions Ltd"
        />
      )}
      <Input
        label={emailLabel}
        name="email"
        type="email"
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
        error={errors.email || (emailTaken ? 'An account with this email already exists.' : null)}
        icon={<Mail className="h-4 w-4" />}
        placeholder="you@company.com"
      />
      <Input
        label={emailConfirmLabel}
        name="confirmEmail"
        type="email"
        value={form.confirmEmail}
        onChange={(e) => update('confirmEmail', e.target.value)}
        error={errors.confirmEmail}
        icon={<Mail className="h-4 w-4" />}
        placeholder="you@company.com"
      />
      {isCompany ? (
        <Input
          label="Company Website"
          name="companyWebsite"
          value={form.companyWebsite}
          onChange={(e) => update('companyWebsite', e.target.value)}
          error={errors.companyWebsite}
          icon={<LinkIcon className="h-4 w-4" />}
          placeholder="https://company.com"
        />
      ) : (
        <>
          <Input
            label="Personal Website"
            name="personalWebsite"
            value={form.personalWebsite}
            onChange={(e) => update('personalWebsite', e.target.value)}
            error={errors.personalWebsite}
            icon={<LinkIcon className="h-4 w-4" />}
            placeholder="https://yourname.com"
          />
          <Input
            label="Portfolio Website"
            name="portfolioWebsite"
            value={form.portfolioWebsite}
            onChange={(e) => update('portfolioWebsite', e.target.value)}
            error={errors.portfolioWebsite}
            icon={<LinkIcon className="h-4 w-4" />}
            placeholder="https://portfolio.com"
          />
        </>
      )}
      {isCompany ? (
        <SearchableSelect
          label="Industry Role"
          value={form.industryRole}
          onChange={(v) => update('industryRole', v)}
          options={INDUSTRY_ROLES}
          placeholder="Select your industry role"
          error={errors.industryRole}
          required
        />
      ) : (
        <SearchableSelect
          label="Primary Profession"
          value={form.primaryProfession}
          onChange={(v) => update('primaryProfession', v)}
          options={[
            'Independent Producer', 'Director', 'Writer-Director', 'Executive Producer',
            'Development Consultant', 'Script Consultant', 'Casting Director',
            'Sales Agent', 'Financier', 'Other',
          ]}
          placeholder="Select your primary profession"
          error={errors.primaryProfession}
          required
        />
      )}
      <SearchableSelect
        label="Country"
        value={form.country}
        onChange={(v) => update('country', v)}
        options={COUNTRIES}
        placeholder="Select your country"
        error={errors.country}
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        value={form.password}
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
        value={form.confirmPassword}
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
        value={form.dateOfBirth}
        onChange={(e) => update('dateOfBirth', e.target.value)}
        error={errors.dateOfBirth}
        icon={<Calendar className="h-4 w-4" />}
      />

      {/* Optional fields */}
      <div className="border border-border bg-background/50 p-5">
        <p className="mb-4 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Optional details</p>
        <div className="space-y-4">
          <Input
            label="LinkedIn Profile"
            name="linkedinUrl"
            value={form.linkedinUrl}
            onChange={(e) => update('linkedinUrl', e.target.value)}
            error={errors.linkedinUrl}
            icon={<LinkIcon className="h-4 w-4" />}
            placeholder="https://linkedin.com/in/you"
          />
          <Input
            label="IMDb Profile"
            name="imdbUrl"
            value={form.imdbUrl}
            onChange={(e) => update('imdbUrl', e.target.value)}
            error={errors.imdbUrl}
            icon={<Film className="h-4 w-4" />}
            placeholder="https://imdb.com/name/you"
          />
          <Input
            label="Years in Industry"
            name="yearsInIndustry"
            type="number"
            min="0"
            max="80"
            value={form.yearsInIndustry}
            onChange={(e) => update('yearsInIndustry', e.target.value)}
            error={errors.yearsInIndustry}
            icon={<Briefcase className="h-4 w-4" />}
            placeholder="10"
          />
          <Input
            label="City"
            name="city"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            error={errors.city}
            icon={<Globe className="h-4 w-4" />}
            placeholder="Los Angeles"
          />
          <SearchableSelect
            label="Preferred Budget Range"
            value={form.preferredBudgetRange}
            onChange={(v) => update('preferredBudgetRange', v)}
            options={BUDGET_RANGES}
            placeholder="Select budget range"
          />
          <div>
            <label className="mb-2 block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Genres of Interest</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleArray(genresOfInterest, g, setGenresOfInterest)}
                  className={`border px-3 py-1.5 font-mono text-2xs uppercase tracking-wider transition-all duration-200 ${genresOfInterest.includes(g) ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-hover hover:border-foreground/20'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block font-mono text-2xs uppercase tracking-wider text-muted-foreground">Types of Projects Seeking</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleArray(projectTypesSeeking, t, setProjectTypesSeeking)}
                  className={`border px-3 py-1.5 font-mono text-2xs uppercase tracking-wider transition-all duration-200 ${projectTypesSeeking.includes(t) ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-hover hover:border-foreground/20'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            label="Short Biography"
            name="bio"
            rows={3}
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            error={errors.bio}
            placeholder="Tell us about your work in the industry..."
          />
        </div>
      </div>

      {isCompany && (
        <Alert variant="info">
          A verification email will be sent to your company email address before your Industry account becomes active.
        </Alert>
      )}

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
