import { useState, useEffect } from 'react';
import { Save, Settings, Eye, EyeOff, Sliders, FileCheck, Compass, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchPlatformConfig, updatePlatformConfig, logAction, type PlatformConfig } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

export function AdminConfig() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformConfig().then((c) => { setConfig(c); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!config || !profile) return;
    setSaving(true);
    await updatePlatformConfig(config);
    await logAction(profile.id, 'Updated platform configuration', 'configuration', { config });
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
        title="Platform Configuration"
        description="Control platform-wide behaviour. Changes apply immediately."
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving} loading={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Reviews & Submissions */}
        <Card>
          <CardHeader title="Reviews & Submissions" subtitle="Control how reviews and submissions work" icon={<FileCheck className="h-5 w-5" />} />
          <div className="mt-4 grid gap-4 p-5 pt-0 sm:grid-cols-2">
            <Input
              type="number"
              min={1}
              label="Reviews Required Per Submission"
              value={config?.reviews_required_per_submission ?? 3}
              onChange={(e) => setConfig(config ? { ...config, reviews_required_per_submission: parseInt(e.target.value) } : config)}
            />
            <Input
              type="number"
              min={1}
              label="Maximum Active Submissions"
              value={config?.max_active_submissions ?? 5}
              onChange={(e) => setConfig(config ? { ...config, max_active_submissions: parseInt(e.target.value) } : config)}
            />
            <Input
              type="text"
              label="Reader Milestone Pages (comma-separated)"
              value={config?.reader_milestone_pages?.join(', ') ?? '3, 10, 15, 45'}
              onChange={(e) => setConfig(config ? { ...config, reader_milestone_pages: e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) } : config)}
            />
            <Input
              type="number"
              min={1}
              label="Maximum Upload Size (MB)"
              value={config?.max_upload_size_mb ?? 10}
              onChange={(e) => setConfig(config ? { ...config, max_upload_size_mb: parseInt(e.target.value) } : config)}
            />
            <Input
              type="text"
              label="Supported File Types (comma-separated)"
              value={config?.supported_file_types?.join(', ') ?? 'pdf'}
              onChange={(e) => setConfig(config ? { ...config, supported_file_types: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : config)}
            />
          </div>
        </Card>

        {/* Discovery */}
        <Card>
          <CardHeader title="Discovery Requirements" subtitle="Control when screenplays become visible to industry" icon={<Compass className="h-5 w-5" />} />
          <div className="mt-4 grid gap-4 p-5 pt-0 sm:grid-cols-2">
            <Input
              type="number"
              min={1}
              label="Minimum Readers for Discovery"
              value={config?.min_readers_for_discovery ?? 3}
              onChange={(e) => setConfig(config ? { ...config, min_readers_for_discovery: parseInt(e.target.value) } : config)}
            />
            <Input
              type="number"
              min={1}
              label="Minimum Completed Reviews"
              value={config?.min_completed_reviews_for_discovery ?? 2}
              onChange={(e) => setConfig(config ? { ...config, min_completed_reviews_for_discovery: parseInt(e.target.value) } : config)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Minimum Confidence Level</label>
              <select value={config?.min_confidence_level ?? 'medium'} onChange={(e) => setConfig(config ? { ...config, min_confidence_level: e.target.value } : config)} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Auto-Validate Screenplays</label>
              <button
                onClick={() => setConfig(config ? { ...config, auto_validate_screenplays: !config.auto_validate_screenplays } : config)}
                className="flex w-full items-center justify-between  border border-border bg-background px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="text-sm text-foreground">{config?.auto_validate_screenplays ? 'Enabled' : 'Disabled'}</span>
                {config?.auto_validate_screenplays ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </Card>

        {/* Algorithm Weighting */}
        <Card>
          <CardHeader title="Algorithm Weighting" subtitle="Balance human behaviour vs AI analysis" icon={<Sliders className="h-5 w-5" />} />
          <div className="mt-4 grid gap-4 p-5 pt-0 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Human Weighting ({config?.human_weighting ?? 0.7})</label>
              <input type="range" min={0} max={1} step={0.1} value={config?.human_weighting ?? 0.7} onChange={(e) => setConfig(config ? { ...config, human_weighting: parseFloat(e.target.value) } : config)} className="w-full" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">AI Weighting ({config?.ai_weighting ?? 0.3})</label>
              <input type="range" min={0} max={1} step={0.1} value={config?.ai_weighting ?? 0.3} onChange={(e) => setConfig(config ? { ...config, ai_weighting: parseFloat(e.target.value) } : config)} className="w-full" />
            </div>
          </div>
          <p className="mt-2 px-5 pb-5 text-xs text-muted-foreground">Human + AI weighting should equal 1.0 for balanced results.</p>
        </Card>

        {/* Industry Verification */}
        <Card>
          <CardHeader title="Industry Verification" subtitle="Control industry member verification" icon={<ShieldCheck className="h-5 w-5" />} />
          <div className="mt-4 grid gap-4 p-5 pt-0 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Verification Required</label>
              <button
                onClick={() => setConfig(config ? { ...config, industry_verification_required: !config.industry_verification_required } : config)}
                className="flex w-full items-center justify-between  border border-border bg-background px-3 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <span className="text-sm text-foreground">{config?.industry_verification_required ? 'Required' : 'Not Required'}</span>
                {config?.industry_verification_required ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <Input
              type="number"
              min={0}
              label="Min Reviews for Verification"
              value={config?.industry_min_reviews_for_verification ?? 5}
              onChange={(e) => setConfig(config ? { ...config, industry_min_reviews_for_verification: parseInt(e.target.value) } : config)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
