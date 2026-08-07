import { useState, useEffect } from 'react';
import { Settings2, Save, Shield, Database, Download, Upload, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchSystemSettings, updateSystemSettings, logAction, type SystemSettings } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  useEffect(() => {
    fetchSystemSettings().then((s) => { setSettings(s); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!settings || !profile) return;
    setSaving(true);
    await updateSystemSettings(settings);
    await logAction(profile.id, 'Updated system settings', 'settings', { settings });
    setSaving(false);
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-20 " />
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 " />)}
    </div>
  );

  return (
    <div>
      <PageHeader
        label="Admin"
        title="Settings"
        description="Platform-wide system settings and security controls."
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving} loading={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader title="General" subtitle="Platform identity" icon={<Settings2 className="h-5 w-5" />} />
          <div className="mt-4 grid gap-4 p-5 pt-0 sm:grid-cols-2">
            <Input label="Platform Name" value={settings?.platform_name ?? ''} onChange={(e) => setSettings(settings ? { ...settings, platform_name: e.target.value } : settings)} />
            <Input label="Support Email" value={settings?.support_email ?? ''} onChange={(e) => setSettings(settings ? { ...settings, support_email: e.target.value } : settings)} />
            <Input label="Logo URL" value={settings?.logo_url ?? ''} onChange={(e) => setSettings(settings ? { ...settings, logo_url: e.target.value } : settings)} />
            <Input label="Favicon URL" value={settings?.favicon_url ?? ''} onChange={(e) => setSettings(settings ? { ...settings, favicon_url: e.target.value } : settings)} />
            <Input label="Homepage Slug" value={settings?.homepage_slug ?? ''} onChange={(e) => setSettings(settings ? { ...settings, homepage_slug: e.target.value } : settings)} />
          </div>
        </Card>

        {/* Registration Settings */}
        <Card>
          <CardHeader title="Registration" subtitle="Control user registration" icon={<Settings2 className="h-5 w-5" />} />
          <div className="mt-4 space-y-3 p-5 pt-0">
            <label className="flex items-center gap-3  rounded-xl border border-border bg-background p-3.5 transition-colors hover:bg-surface-hover cursor-pointer">
              <input type="checkbox" checked={settings?.allow_new_registrations ?? true} onChange={(e) => setSettings(settings ? { ...settings, allow_new_registrations: e.target.checked } : settings)} className="h-4 w-4 rounded border-input" />
              <span className="text-sm text-foreground">Allow New Registrations</span>
            </label>
            <label className="flex items-center gap-3  rounded-xl border border-border bg-background p-3.5 transition-colors hover:bg-surface-hover cursor-pointer">
              <input type="checkbox" checked={settings?.email_verification_required ?? false} onChange={(e) => setSettings(settings ? { ...settings, email_verification_required: e.target.checked } : settings)} className="h-4 w-4 rounded border-input" />
              <span className="text-sm text-foreground">Require Email Verification</span>
            </label>
            <label className="flex items-center gap-3  rounded-xl border border-border bg-background p-3.5 transition-colors hover:bg-surface-hover cursor-pointer">
              <input type="checkbox" checked={settings?.industry_verification_required ?? true} onChange={(e) => setSettings(settings ? { ...settings, industry_verification_required: e.target.checked } : settings)} className="h-4 w-4 rounded border-input" />
              <span className="text-sm text-foreground">Require Industry Verification</span>
            </label>
          </div>
        </Card>

        {/* Legal Pages */}
        <Card>
          <CardHeader title="Legal Pages" subtitle="Links to legal pages" icon={<Settings2 className="h-5 w-5" />} />
          <div className="mt-4 grid gap-4 p-5 pt-0 sm:grid-cols-3">
            <Input label="Terms URL" value={settings?.terms_url ?? ''} onChange={(e) => setSettings(settings ? { ...settings, terms_url: e.target.value } : settings)} />
            <Input label="Privacy URL" value={settings?.privacy_url ?? ''} onChange={(e) => setSettings(settings ? { ...settings, privacy_url: e.target.value } : settings)} />
            <Input label="Cookie Policy URL" value={settings?.cookie_policy_url ?? ''} onChange={(e) => setSettings(settings ? { ...settings, cookie_policy_url: e.target.value } : settings)} />
          </div>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader title="Maintenance Mode" subtitle="Take the platform offline temporarily" icon={<AlertTriangle className="h-5 w-5" />} />
          <div className="mt-4 space-y-3 p-5 pt-0">
            <button
              onClick={() => setShowMaintenanceConfirm(true)}
              className={`flex w-full items-center justify-between  border border-border bg-background px-4 py-3 transition-colors hover:bg-surface-hover`}
            >
              <span className="text-sm font-medium text-foreground">{settings?.maintenance_mode ? 'Maintenance mode is ON' : 'Maintenance mode is OFF'}</span>
              <span className={`h-3 w-3  ${settings?.maintenance_mode ? 'bg-error' : 'bg-success'}`} />
            </button>
            <Textarea
              label="Maintenance Message"
              value={settings?.maintenance_message ?? ''}
              onChange={(e) => setSettings(settings ? { ...settings, maintenance_message: e.target.value } : settings)}
              rows={2}
              placeholder="We are performing maintenance. Please check back soon."
            />
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader title="Security" subtitle="Security monitoring" icon={<Shield className="h-5 w-5" />} />
          <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2">
            <div className=" rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Failed Login Attempts</span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-foreground">—</p>
            </div>
            <div className=" rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Suspicious Activity</span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-foreground">—</p>
            </div>
          </div>
        </Card>

        {/* Backup & Recovery */}
        <Card>
          <CardHeader title="Backup & Recovery" subtitle="Export and import configuration" icon={<Database className="h-5 w-5" />} />
          <div className="mt-4 flex flex-wrap gap-3 p-5 pt-0">
            <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export Configuration</Button>
            <Button variant="outline" size="sm"><Upload className="h-4 w-4" /> Import Configuration</Button>
            <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export Theme</Button>
            <Button variant="outline" size="sm"><Upload className="h-4 w-4" /> Import Theme</Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={showMaintenanceConfirm}
        title="Toggle Maintenance Mode"
        message={settings?.maintenance_mode ? 'Disable maintenance mode? The platform will be accessible again.' : 'Enable maintenance mode? Users will not be able to access the platform.'}
        confirmLabel={settings?.maintenance_mode ? 'Disable' : 'Enable'}
        variant="primary"
        onConfirm={async () => {
          if (settings && profile) {
            const newMode = !settings.maintenance_mode;
            setSettings({ ...settings, maintenance_mode: newMode });
            await updateSystemSettings({ maintenance_mode: newMode });
            await logAction(profile.id, `Toggled maintenance mode to ${newMode}`, 'settings', { maintenance_mode: newMode });
          }
          setShowMaintenanceConfirm(false);
        }}
        onCancel={() => setShowMaintenanceConfirm(false)}
      />
    </div>
  );
}
