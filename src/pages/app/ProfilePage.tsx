import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe, Calendar, FileText, Coins, Eye, Star, Award, Linkedin, Film, Building2, BadgeCheck, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { supabase } from '@/lib/supabase';
import type { WriterProfile, ReaderProfile, IndustryProfile } from '@/types/database';

export function ProfilePage() {
  const { profile, activeRole } = useAuth();
  const [writerProfile, setWriterProfile] = useState<WriterProfile | null>(null);
  const [readerProfile, setReaderProfile] = useState<ReaderProfile | null>(null);
  const [industryProfile, setIndustryProfile] = useState<IndustryProfile | null>(null);
  const [achievements, setAchievements] = useState<Array<{ name: string; description: string; icon: string; earned_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      if (activeRole === 'writer') {
        const { data } = await supabase.from('writer_profiles').select('*').eq('user_id', profile.id).maybeSingle();
        setWriterProfile(data as WriterProfile | null);
      } else if (activeRole === 'reader') {
        const { data } = await supabase.from('reader_profiles').select('*').eq('user_id', profile.id).maybeSingle();
        setReaderProfile(data as ReaderProfile | null);
        const { data: ach } = await supabase
          .from('user_achievements')
          .select('*, achievements(*)')
          .eq('user_id', profile.id)
          .order('earned_at', { ascending: false });
        setAchievements((ach ?? []).map((ua: Record<string, unknown>) => ({
          name: (ua.achievements as Record<string, unknown>)?.name as string,
          description: (ua.achievements as Record<string, unknown>)?.description as string,
          icon: (ua.achievements as Record<string, unknown>)?.icon as string,
          earned_at: ua.earned_at as string,
        })));
      } else if (activeRole === 'industry') {
        const { data } = await supabase.from('industry_profiles').select('*').eq('user_id', profile.id).maybeSingle();
        setIndustryProfile(data as IndustryProfile | null);
      }
      setLoading(false);
    }
    load();
  }, [profile, activeRole]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  const roleLabel = activeRole ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1) : '';

  return (
    <div className="space-y-6">
      <PageHeader
        label={roleLabel}
        title="Profile"
        description="Your public profile and account information."
        actions={
          <Link to="/app/settings">
            <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Edit Profile</Button>
          </Link>
        }
      />

      {/* Profile header card */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64  bg-accent/8 blur-3xl" />
        <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={profile?.username || 'User'} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold text-foreground">{profile?.username}</h2>
                {industryProfile?.company_verified && (
                  <StatusBadge status="Verified" variant="success" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{profile?.full_name || profile?.email}</p>
              {industryProfile && (
                <p className="mt-0.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                  {industryProfile.account_type === 'company' ? industryProfile.company_name : industryProfile.primary_profession}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Role-specific content */}
      {activeRole === 'writer' && <WriterProfileContent profile={writerProfile} memberSince={profile?.created_at || ''} />}
      {activeRole === 'reader' && <ReaderProfileContent profile={readerProfile} achievements={achievements} memberSince={profile?.created_at || ''} />}
      {activeRole === 'industry' && <IndustryProfileContent profile={industryProfile} memberSince={profile?.created_at || ''} />}
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <div>
        <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || 'Not set'}</p>
      </div>
    </div>
  );
}

function WriterProfileContent({ profile, memberSince }: { profile: WriterProfile | null; memberSince: string }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Screenplays Uploaded" value={0} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Reviews Completed" value={0} icon={<Eye className="h-5 w-5" />} />
        <StatCard label="Submission Credits" value={0} icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Member Since" value={new Date(memberSince).getFullYear()} icon={<Calendar className="h-5 w-5" />} />
      </div>
      <Card>
        <CardHeader title="Profile Details" icon={<FileText className="h-5 w-5" />} />
        <div className="mt-4 grid gap-4 p-5 pt-4 sm:grid-cols-2">
          <ProfileField icon={<Pencil className="h-4 w-4" />} label="Biography" value={profile?.bio} />
          <ProfileField icon={<MapPin className="h-4 w-4" />} label="City" value={profile?.city} />
          <ProfileField icon={<Globe className="h-4 w-4" />} label="Website" value={profile?.website} />
          <ProfileField icon={<Calendar className="h-4 w-4" />} label="Member Since" value={new Date(memberSince).toLocaleDateString()} />
        </div>
        <div className="p-5 pt-0">
          <SectionLabel className="mb-2">Industry Introduction Preferences</SectionLabel>
          <p className="text-sm text-muted-foreground">Manage your introduction preferences from Settings to control how industry professionals can reach you.</p>
        </div>
      </Card>
    </>
  );
}

function ReaderProfileContent({ profile, achievements, memberSince }: { profile: ReaderProfile | null; achievements: Array<{ name: string; description: string; icon: string; earned_at: string }>; memberSince: string }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reviews Completed" value={profile?.reviews_count ?? 0} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Review Credits" value={0} icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Reputation" value={profile?.reputation_score ?? 0} icon={<Star className="h-5 w-5" />} color="text-accent" />
        <StatCard label="Member Since" value={new Date(memberSince).getFullYear()} icon={<Calendar className="h-5 w-5" />} />
      </div>
      <Card>
        <CardHeader title="Profile Details" icon={<FileText className="h-5 w-5" />} />
        <div className="mt-4 grid gap-4 p-5 pt-4 sm:grid-cols-2">
          <ProfileField icon={<Pencil className="h-4 w-4" />} label="Biography" value={profile?.bio} />
          <ProfileField icon={<MapPin className="h-4 w-4" />} label="City" value={profile?.city} />
          <ProfileField icon={<Calendar className="h-4 w-4" />} label="Member Since" value={new Date(memberSince).toLocaleDateString()} />
        </div>
      </Card>
      <Card>
        <CardHeader title="Achievements" icon={<Award className="h-5 w-5" />} />
        <div className="p-5 pt-4">
          {achievements.length === 0 ? (
            <EmptyState icon={<Award className="h-7 w-7" />} title="No achievements yet" description="Complete reviews to earn achievements." tone="encouraging" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a, i) => (
                <div key={i} className="flex items-center gap-3  rounded-xl border border-border bg-background p-4">
                  <div className="flex h-10 w-10 items-center justify-center  bg-accent/10 text-accent">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function IndustryProfileContent({ profile, memberSince }: { profile: IndustryProfile | null; memberSince: string }) {
  return (
    <Card>
      <CardHeader
        title="Company & Professional Information"
        icon={<Building2 className="h-5 w-5" />}
        action={profile?.company_verified ? <StatusBadge status="Company Verified" variant="success" /> : undefined}
      />
      <div className="mt-4 grid gap-4 p-5 pt-4 sm:grid-cols-2">
        <ProfileField icon={<Building2 className="h-4 w-4" />} label="Company Name" value={profile?.company_name} />
        <ProfileField icon={<BadgeCheck className="h-4 w-4" />} label="Account Type" value={profile?.account_type === 'company' ? 'Company Representative' : 'Independent Professional'} />
        <ProfileField icon={<Pencil className="h-4 w-4" />} label="Profession" value={profile?.primary_profession} />
        <ProfileField icon={<Globe className="h-4 w-4" />} label="Website" value={profile?.company_website || profile?.personal_website} />
        <ProfileField icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" value={profile?.linkedin_url} />
        <ProfileField icon={<Film className="h-4 w-4" />} label="IMDb" value={profile?.imdb_url} />
        <ProfileField icon={<MapPin className="h-4 w-4" />} label="City" value={profile?.city} />
        <ProfileField icon={<Calendar className="h-4 w-4" />} label="Member Since" value={new Date(memberSince).toLocaleDateString()} />
      </div>
      <div className="p-5 pt-0">
        <SectionLabel className="mb-2">Genres of Interest</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(profile?.genres_of_interest ?? []).map((g, i) => (
            <span key={i} className=" border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">{g}</span>
          ))}
          {(!profile?.genres_of_interest || profile.genres_of_interest.length === 0) && (
            <span className="text-sm text-muted-foreground">No genres specified</span>
          )}
        </div>
      </div>
      <div className="p-5 pt-0">
        <SectionLabel className="mb-2">Biography</SectionLabel>
        <p className="text-sm text-muted-foreground">{profile?.bio || 'No biography set.'}</p>
      </div>
    </Card>
  );
}
