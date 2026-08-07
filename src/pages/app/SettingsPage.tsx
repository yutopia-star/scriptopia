import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Palette, Shield, Plus, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { supabase } from '@/lib/supabase';
import { ROLE_LABELS } from '@/lib/constants';
import type { AppRole } from '@/types/database';

type Section = 'account' | 'profile' | 'notifications' | 'appearance' | 'privacy' | 'roles';

const SECTIONS: { id: Section; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'roles', label: 'Roles', icon: Plus },
];

export function SettingsPage() {
  const { profile, activeRole, roles, signOut, refreshProfile } = useAuth();
  const { settings, updateSettings } = useNotifications();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('account');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Account form
  const [accountForm, setAccountForm] = useState({ username: '', email: '' });
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState<string | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({ bio: '', city: '', website: '' });

  useEffect(() => {
    if (profile) {
      setAccountForm({ username: profile.username, email: profile.email });
      setProfileForm({ bio: '', city: '', website: '' });
    }
  }, [profile]);

  useEffect(() => {
    async function loadProfileData() {
      if (!profile || !activeRole) return;
      if (activeRole === 'writer') {
        const { data } = await supabase.from('writer_profiles').select('*').eq('user_id', profile.id).maybeSingle();
        if (data) setProfileForm({ bio: data.bio || '', city: data.city || '', website: data.website || '' });
      } else if (activeRole === 'reader') {
        const { data } = await supabase.from('reader_profiles').select('*').eq('user_id', profile.id).maybeSingle();
        if (data) setProfileForm({ bio: data.bio || '', city: data.city || '', website: '' });
      } else if (activeRole === 'industry') {
        const { data } = await supabase.from('industry_profiles').select('*').eq('user_id', profile.id).maybeSingle();
        if (data) setProfileForm({ bio: data.bio || '', city: data.city || '', website: data.company_website || data.personal_website || '' });
      }
    }
    loadProfileData();
  }, [profile, activeRole]);

  function showSaved(msg: string) {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  }

  async function saveAccount() {
    setSaving(true);
    if (profile) {
      await supabase.from('profiles').update({
        username: accountForm.username,
        email: accountForm.email,
      }).eq('id', profile.id);
    }
    setSaving(false);
    showSaved('Account updated successfully.');
  }

  async function changePassword() {
    setPwError(null);
    if (!pwForm.new || pwForm.new !== pwForm.confirm) {
      setPwError('Passwords do not match.');
      return;
    }
    if (pwForm.new.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.new });
    setSaving(false);
    if (error) {
      setPwError(error.message);
    } else {
      setPwForm({ current: '', new: '', confirm: '' });
      showSaved('Password changed successfully.');
    }
  }

  async function saveProfile() {
    setSaving(true);
    if (profile && activeRole === 'writer') {
      await supabase.from('writer_profiles').update({
        bio: profileForm.bio,
        city: profileForm.city,
        website: profileForm.website,
      }).eq('user_id', profile.id);
    } else if (profile && activeRole === 'reader') {
      await supabase.from('reader_profiles').update({
        bio: profileForm.bio,
        city: profileForm.city,
      }).eq('user_id', profile.id);
    } else if (profile && activeRole === 'industry') {
      await supabase.from('industry_profiles').update({
        bio: profileForm.bio,
        city: profileForm.city,
      }).eq('user_id', profile.id);
    }
    setSaving(false);
    showSaved('Profile updated successfully.');
  }

  async function saveNotificationSettings(updates: Record<string, boolean>) {
    setSaving(true);
    await updateSettings(updates);
    setSaving(false);
    showSaved('Notification preferences saved.');
  }

  async function addRole(role: AppRole) {
    if (!profile) return;
    setSaving(true);
    await supabase.from('user_roles').insert({
      user_id: profile.id,
      role,
      is_active: false,
      verification_status: 'unverified',
    });
    if (role === 'writer') await supabase.from('writer_profiles').insert({ user_id: profile.id }).eq('user_id', profile.id);
    if (role === 'reader') await supabase.from('reader_profiles').insert({ user_id: profile.id });
    if (role === 'industry') await supabase.from('industry_profiles').insert({ user_id: profile.id, account_type: 'independent' });
    setSaving(false);
    refreshProfile();
    showSaved(`${ROLE_LABELS[role]} role added. Switch to it from your profile.`);
  }

  async function switchRole(role: AppRole) {
    if (!profile) return;
    await supabase.from('user_roles').update({ is_active: false }).eq('user_id', profile.id);
    await supabase.from('user_roles').update({ is_active: true }).eq('user_id', profile.id).eq('role', role);
    await supabase.from('profiles').update({ active_role: role }).eq('id', profile.id);
    refreshProfile();
    showSaved(`Switched to ${ROLE_LABELS[role]} role.`);
  }

  async function deleteAccount() {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({ username: `deleted_${profile.id.slice(0, 8)}`, email: `deleted_${profile.id.slice(0, 8)}@deleted.local` }).eq('id', profile.id);
    await signOut();
    navigate('/');
  }

  const enrolledRoles = roles.map((r) => r.role);
  const availableRoles: AppRole[] = (['writer', 'reader', 'industry'] as const).filter((r) => !enrolledRoles.includes(r));

  return (
    <div>
      <PageHeader
        label="Preferences"
        title="Settings"
        description="Manage your account, profile, and preferences."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Section nav */}
        <div className="lg:w-56 lg:shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex w-full items-center gap-2.5  px-3 py-2.5 text-sm font-medium transition-colors ${
                  section === id ? 'bg-primary text-primary-foreground ' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {savedMessage && (
            <div className="flex items-center gap-2  border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              <Check className="h-4 w-4 shrink-0" />
              {savedMessage}
            </div>
          )}

          {section === 'account' && (
            <>
              <Card>
                <CardHeader title="Account Information" icon={<User className="h-5 w-5" />} />
                <div className="mt-4 space-y-4 p-5 pt-4">
                  <Input label="Username" value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })} />
                  <Input label="Email Address" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} />
                  <Button onClick={saveAccount} loading={saving}>Save Changes</Button>
                </div>
              </Card>
              <Card>
                <CardHeader title="Change Password" icon={<Shield className="h-5 w-5" />} />
                <div className="mt-4 space-y-4 p-5 pt-4">
                  <Input label="New Password" type="password" value={pwForm.new} onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })} />
                  <Input label="Confirm Password" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                  {pwError && <p className="text-sm text-error">{pwError}</p>}
                  <Button onClick={changePassword} loading={saving}>Change Password</Button>
                </div>
              </Card>
              <Card>
                <CardHeader title="Delete Account" icon={<Trash2 className="h-5 w-5" />} />
                <div className="p-5 pt-3">
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button variant="danger" className="mt-4" onClick={() => setShowDeleteConfirm(true)}>Delete Account</Button>
                </div>
              </Card>
            </>
          )}

          {section === 'profile' && (
            <Card>
              <CardHeader title="Profile Information" icon={<User className="h-5 w-5" />} />
              <div className="mt-4 space-y-4 p-5 pt-4">
                <div>
                  <SectionLabel className="mb-2">Avatar</SectionLabel>
                  <div className="flex items-center gap-3">
                    <Avatar name={profile?.username || 'User'} size="lg" />
                    <Button variant="outline" size="sm">Upload New</Button>
                  </div>
                </div>
                <Textarea label="Biography" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." />
                <Input label="City" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                <Input label="Website" value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} />
                <Button onClick={saveProfile} loading={saving}>Save Profile</Button>
              </div>
            </Card>
          )}

          {section === 'notifications' && settings && (
            <Card>
              <CardHeader title="Notification Preferences" icon={<Bell className="h-5 w-5" />} />
              <div className="mt-4 space-y-4 p-5 pt-4">
                <Checkbox checked={settings.email_notifications} onChange={(v) => saveNotificationSettings({ email_notifications: v })} label="Email Notifications" />
                <Checkbox checked={settings.in_app_notifications} onChange={(v) => saveNotificationSettings({ in_app_notifications: v })} label="In-App Notifications" />
                <Checkbox checked={settings.marketing_emails} onChange={(v) => saveNotificationSettings({ marketing_emails: v })} label="Marketing Emails" />
                <Checkbox checked={settings.review_reminders} onChange={(v) => saveNotificationSettings({ review_reminders: v })} label="Review Reminders" />
                <Checkbox checked={settings.producer_contact_requests} onChange={(v) => saveNotificationSettings({ producer_contact_requests: v })} label="Producer Contact Requests" />
              </div>
            </Card>
          )}

          {section === 'appearance' && (
            <Card>
              <CardHeader title="Theme" icon={<Palette className="h-5 w-5" />} />
              <div className="mt-4 grid grid-cols-3 gap-3 p-5 pt-4">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-2  border-2 p-4 transition-all ${theme === t ? 'border-primary ' : 'border-border hover:border-primary/30'}`}
                  >
                    <div className={`h-12 w-full  ${t === 'light' ? 'bg-background border border-border' : t === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-r from-background to-slate-900'}`} />
                    <span className="text-sm font-medium capitalize text-foreground">{t}</span>
                    {theme === t && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {section === 'privacy' && settings && (
            <Card>
              <CardHeader title="Privacy Settings" icon={<Shield className="h-5 w-5" />} />
              <div className="mt-4 space-y-4 p-5 pt-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Profile Visibility</label>
                  <select
                    value={settings.profile_visibility}
                    onChange={(e) => updateSettings({ profile_visibility: e.target.value })}
                    className="input-field"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="industry_only">Industry Only</option>
                  </select>
                </div>
                <Checkbox
                  checked={settings.allow_industry_introductions}
                  onChange={(v) => updateSettings({ allow_industry_introductions: v })}
                  label="Allow Industry Introductions"
                />
                <div>
                  <SectionLabel className="mb-1">Communication Preferences</SectionLabel>
                  <p className="text-sm text-muted-foreground">Control who can contact you and how.</p>
                </div>
                <div>
                  <SectionLabel className="mb-2">Data Export</SectionLabel>
                  <Button variant="outline" size="sm">Export My Data</Button>
                </div>
              </div>
            </Card>
          )}

          {section === 'roles' && (
            <>
              <Card>
                <CardHeader title="Your Roles" icon={<User className="h-5 w-5" />} />
                <div className="mt-4 space-y-2 p-5 pt-4">
                  {roles.map((r) => (
                    <div key={r.id} className="flex items-center justify-between  rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center  ${r.is_active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                          {r.is_active && <Check className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ROLE_LABELS[r.role]}</p>
                          <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{r.is_active ? 'Active' : 'Inactive'}</p>
                        </div>
                      </div>
                      {!r.is_active && (
                        <Button variant="outline" size="sm" onClick={() => switchRole(r.role)}>Switch to</Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              {availableRoles.length > 0 && (
                <Card>
                  <CardHeader title="Add Additional Roles" icon={<Plus className="h-5 w-5" />} />
                  <div className="p-5 pt-3">
                    <p className="text-sm text-muted-foreground">Enable additional roles to unlock new features. Your existing data will never be deleted.</p>
                    <div className="mt-4 space-y-2">
                      {availableRoles.map((role) => (
                        <div key={role} className="flex items-center justify-between  rounded-xl border border-border bg-background p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{ROLE_LABELS[role]}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => addRole(role)} loading={saving}>
                            <Plus className="h-4 w-4" /> Add Role
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        message="Are you sure you want to delete your account? This will anonymise your data and sign you out. This action cannot be undone."
        confirmLabel="Delete Account"
        onConfirm={deleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
