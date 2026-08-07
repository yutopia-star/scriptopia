import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { RoleSelection } from '@/components/auth/RoleSelection';
import { IndustryTypeSelection } from '@/components/auth/IndustryTypeSelection';
import { ReaderWriterForm, type AccountFormData } from '@/components/auth/ReaderWriterForm';
import { IndustryForm, type IndustryFormData } from '@/components/auth/IndustryForm';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import type { AppRole, IndustryAccountType } from '@/types/database';

type Step = 'role' | 'industryType' | 'details';

export function CreateAccountPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [industryType, setIndustryType] = useState<IndustryAccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps = selectedRole === 'industry'
    ? ['Choose Role', 'Industry Type', 'Account Details']
    : ['Choose Role', 'Account Details'];
  const currentIndex = step === 'role' ? 0 : step === 'industryType' ? 1 : selectedRole === 'industry' ? 2 : 1;

  async function createAuthAndProfile(email: string, password: string, profileData: Record<string, unknown>, role: AppRole, extraProfile?: Record<string, unknown>) {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Account creation failed. Please try again.');

    const userId = authData.user.id;
    const baseProfile = {
      id: userId,
      username: profileData.username,
      email,
      full_name: profileData.full_name ?? null,
      date_of_birth: profileData.date_of_birth,
      country: profileData.country,
      active_role: role,
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('profiles').insert(baseProfile);
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
      is_active: true,
      verification_status: 'unverified',
    });
    if (roleError) throw new Error(roleError.message);

    if (role === 'reader') {
      await supabase.from('reader_profiles').insert({ user_id: userId });
    } else if (role === 'writer') {
      await supabase.from('writer_profiles').insert({ user_id: userId });
    } else if (role === 'industry' && extraProfile) {
      await supabase.from('industry_profiles').insert({ user_id: userId, ...extraProfile });
    }

    return !!authData.session;
  }

  async function handleReaderWriterSubmit(data: AccountFormData) {
    setLoading(true);
    setSubmitError(null);
    try {
      const hasSession = await createAuthAndProfile(data.email, data.password, {
        username: data.username,
        date_of_birth: data.dateOfBirth,
        country: data.country,
      }, selectedRole!);
      navigate(hasSession ? '/app' : '/email-verification');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleIndustrySubmit(data: IndustryFormData) {
    setLoading(true);
    setSubmitError(null);
    try {
      const extraProfile: Record<string, unknown> = {
        account_type: data.accountType,
        job_title: data.jobTitle ?? null,
        company_name: data.companyName ?? null,
        company_website: data.companyWebsite ?? null,
        industry_role: data.industryRole ?? null,
        primary_profession: data.primaryProfession ?? null,
        linkedin_url: data.linkedinUrl ?? null,
        imdb_url: data.imdbUrl ?? null,
        personal_website: data.personalWebsite ?? null,
        portfolio_website: data.portfolioWebsite ?? null,
        years_in_industry: data.yearsInIndustry ?? null,
        genres_of_interest: data.genresOfInterest ?? null,
        preferred_budget_range: data.preferredBudgetRange ?? null,
        project_types_seeking: data.projectTypesSeeking ?? null,
        bio: data.bio ?? null,
        city: data.city ?? null,
        verification_status: 'unverified',
        company_verified: false,
      };
      const hasSession = await createAuthAndProfile(data.email, data.password, {
        username: data.username,
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        country: data.country,
      }, 'industry', extraProfile);
      navigate(hasSession ? '/app' : '/email-verification');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="How will you use WhittleScript today? Choose the option that best describes you. You can add or change roles later from your Account Settings."
      maxWidth="max-w-lg"
    >
      <div className="mb-8">
        <ProgressIndicator steps={steps} currentStep={currentIndex} />
      </div>

      {step === 'role' && (
        <div className="animate-fade-in">
          <RoleSelection selectedRole={selectedRole} onSelect={setSelectedRole} />
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => {
                if (selectedRole === 'industry') setStep('industryType');
                else setStep('details');
              }}
              disabled={!selectedRole}
              size="lg"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 'industryType' && (
        <div className="animate-fade-in">
          <IndustryTypeSelection selectedType={industryType} onSelect={setIndustryType} />
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep('role')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => industryType && setStep('details')}
              disabled={!industryType}
              size="lg"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="animate-fade-in">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(selectedRole === 'industry' ? 'industryType' : 'role')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              {selectedRole === 'industry' && industryType === 'company' && 'Company Representative'}
              {selectedRole === 'industry' && industryType === 'independent' && 'Independent Professional'}
              {selectedRole === 'writer' && 'Writer'}
              {selectedRole === 'reader' && 'Reader'}
            </span>
          </div>

          {selectedRole === 'industry' && industryType ? (
            <IndustryForm
              accountType={industryType}
              onSubmit={handleIndustrySubmit}
              loading={loading}
              submitError={submitError}
            />
          ) : (
            <ReaderWriterForm
              onSubmit={handleReaderWriterSubmit}
              loading={loading}
              submitError={submitError}
            />
          )}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="font-medium text-primary underline-offset-2 hover:underline">
          Sign In
        </button>
      </p>
    </AuthLayout>
  );
}
