import { useState, useEffect } from 'react';
import { Settings, History, AlertTriangle, Check, Plus, Save, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import type {
  ReaderContributionAlgorithm,
  SuspiciousReaderActivity,
} from '@/types/database';

export function AdminAlgorithm() {
  const [versions, setVersions] = useState<ReaderContributionAlgorithm[]>([]);
  const [activeVersion, setActiveVersion] = useState<ReaderContributionAlgorithm | null>(null);
  const [suspicious, setSuspicious] = useState<SuspiciousReaderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'settings' | 'history' | 'suspicious'>('settings');

  // New version form
  const [form, setForm] = useState({
    credit_threshold: 1000,
    page_contribution_enabled: true,
    points_per_page: 1.0,
    time_contribution_enabled: true,
    minutes_per_interval: 10.0,
    points_per_time_interval: 1.0,
    max_time_points_per_script: 20,
    feedback_contribution_enabled: true,
    feedback_starting_bonus: 30,
    feedback_reduction_rate: 3.0,
    feedback_minimum_bonus: 10,
    ai_quality_enabled: true,
    ai_quality_weighting: 0.5,
    ai_min_quality_score: 30,
    ai_quality_multiplier: 1.0,
    completion_bonus_enabled: true,
    completion_bonus_points: 15,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: algos }, { data: flags }] = await Promise.all([
      supabase.from('reader_contribution_algorithm').select('*').order('version_number', { ascending: false }),
      supabase.from('suspicious_reader_activity').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const algoList = (algos ?? []) as ReaderContributionAlgorithm[];
    setVersions(algoList);
    setActiveVersion(algoList[0] ?? null);
    setSuspicious((flags ?? []) as SuspiciousReaderActivity[]);
    setLoading(false);
  }

  async function handleCreateVersion() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const { error } = await supabase.rpc('create_algorithm_version', {
        p_credit_threshold: form.credit_threshold,
        p_page_contribution_enabled: form.page_contribution_enabled,
        p_points_per_page: form.points_per_page,
        p_time_contribution_enabled: form.time_contribution_enabled,
        p_minutes_per_interval: form.minutes_per_interval,
        p_points_per_time_interval: form.points_per_time_interval,
        p_max_time_points_per_script: form.max_time_points_per_script,
        p_feedback_contribution_enabled: form.feedback_contribution_enabled,
        p_feedback_starting_bonus: form.feedback_starting_bonus,
        p_feedback_reduction_rate: form.feedback_reduction_rate,
        p_feedback_minimum_bonus: form.feedback_minimum_bonus,
        p_ai_quality_enabled: form.ai_quality_enabled,
        p_ai_quality_weighting: form.ai_quality_weighting,
        p_ai_min_quality_score: form.ai_min_quality_score,
        p_ai_quality_multiplier: form.ai_quality_multiplier,
        p_completion_bonus_enabled: form.completion_bonus_enabled,
        p_completion_bonus_points: form.completion_bonus_points,
        p_notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      setSaveMsg('New algorithm version created successfully.');
      await load();
    } catch (err) {
      setSaveMsg(`Error: ${err instanceof Error ? err.message : 'Failed to create version'}`);
    }
    setSaving(false);
  }

  async function handleResolveFlag(id: string) {
    const { error } = await supabase.rpc('resolve_suspicious_activity', { p_activity_id: id });
    if (!error) await load();
  }

  function syncFormFromActive() {
    if (!activeVersion) return;
    setForm({
      credit_threshold: activeVersion.credit_threshold,
      page_contribution_enabled: activeVersion.page_contribution_enabled,
      points_per_page: activeVersion.points_per_page,
      time_contribution_enabled: activeVersion.time_contribution_enabled,
      minutes_per_interval: activeVersion.minutes_per_interval,
      points_per_time_interval: activeVersion.points_per_time_interval,
      max_time_points_per_script: activeVersion.max_time_points_per_script,
      feedback_contribution_enabled: activeVersion.feedback_contribution_enabled,
      feedback_starting_bonus: activeVersion.feedback_starting_bonus,
      feedback_reduction_rate: activeVersion.feedback_reduction_rate,
      feedback_minimum_bonus: activeVersion.feedback_minimum_bonus,
      ai_quality_enabled: activeVersion.ai_quality_enabled,
      ai_quality_weighting: activeVersion.ai_quality_weighting,
      ai_min_quality_score: activeVersion.ai_min_quality_score,
      ai_quality_multiplier: activeVersion.ai_quality_multiplier,
      completion_bonus_enabled: activeVersion.completion_bonus_enabled,
      completion_bonus_points: activeVersion.completion_bonus_points,
      notes: '',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Settings"
        title="Contribution Algorithm"
        description="Manage the Reader Contribution Credit Algorithm settings."
        actions={activeVersion ? <StatusBadge status={`Active: v${activeVersion.version_number}`} variant="success" /> : undefined}
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {([
          { key: 'settings', label: 'Settings', icon: Settings },
          { key: 'history', label: 'Version History', icon: History },
          { key: 'suspicious', label: 'Suspicious Activity', icon: AlertTriangle },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === 'suspicious' && suspicious.filter((s) => !s.resolved).length > 0 && (
              <span className="ml-1  bg-error px-1.5 py-0.5 text-xs font-semibold text-white">
                {suspicious.filter((s) => !s.resolved).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="space-y-6">
          {saveMsg && (
            <div className={` px-4 py-3 text-sm ${saveMsg.startsWith('Error') ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
              {saveMsg}
            </div>
          )}

          <Card>
            <CardHeader title="Credit Threshold" subtitle="Points required for one screenplay upload credit" icon={<TrendingUp className="h-5 w-5" />} />
            <div className="mt-4 max-w-xs p-5 pt-0">
              <Input
                type="number"
                label="Points per upload credit"
                value={form.credit_threshold}
                onChange={(e) => setForm({ ...form, credit_threshold: Number(e.target.value) })}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Page Contribution" subtitle="Points awarded per verified page read" icon={<Settings className="h-5 w-5" />} />
            <div className="mt-4 space-y-3 p-5 pt-0">
              <Checkbox
                label="Enable page contribution"
                checked={form.page_contribution_enabled}
                onChange={(v) => setForm({ ...form, page_contribution_enabled: v })}
              />
              <div className="max-w-xs">
                <Input
                  type="number"
                  label="Points per page"
                  step="0.1"
                  value={form.points_per_page}
                  onChange={(e) => setForm({ ...form, points_per_page: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Reading Time Contribution" subtitle="Points from verified active reading time" icon={<Settings className="h-5 w-5" />} />
            <div className="mt-4 space-y-3 p-5 pt-0">
              <Checkbox
                label="Enable time contribution"
                checked={form.time_contribution_enabled}
                onChange={(v) => setForm({ ...form, time_contribution_enabled: v })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  type="number"
                  label="Minutes per interval"
                  step="0.5"
                  value={form.minutes_per_interval}
                  onChange={(e) => setForm({ ...form, minutes_per_interval: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Points per interval"
                  step="0.5"
                  value={form.points_per_time_interval}
                  onChange={(e) => setForm({ ...form, points_per_time_interval: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Max points per script"
                  value={form.max_time_points_per_script}
                  onChange={(e) => setForm({ ...form, max_time_points_per_script: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Feedback Contribution" subtitle="Early stop feedback bonus — earlier stops are worth more" icon={<Settings className="h-5 w-5" />} />
            <div className="mt-4 space-y-3 p-5 pt-0">
              <Checkbox
                label="Enable feedback bonus"
                checked={form.feedback_contribution_enabled}
                onChange={(v) => setForm({ ...form, feedback_contribution_enabled: v })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  type="number"
                  label="Starting bonus (at 3 pages)"
                  value={form.feedback_starting_bonus}
                  onChange={(e) => setForm({ ...form, feedback_starting_bonus: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Reduction rate (pages per point lost)"
                  step="0.5"
                  value={form.feedback_reduction_rate}
                  onChange={(e) => setForm({ ...form, feedback_reduction_rate: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Minimum bonus"
                  value={form.feedback_minimum_bonus}
                  onChange={(e) => setForm({ ...form, feedback_minimum_bonus: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="AI Feedback Quality" subtitle="AI-assisted analysis of feedback quality" icon={<Settings className="h-5 w-5" />} />
            <div className="mt-4 space-y-3 p-5 pt-0">
              <Checkbox
                label="Enable AI quality analysis"
                checked={form.ai_quality_enabled}
                onChange={(v) => setForm({ ...form, ai_quality_enabled: v })}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  type="number"
                  label="Quality weighting (0-1)"
                  step="0.1"
                  min="0"
                  max="1"
                  value={form.ai_quality_weighting}
                  onChange={(e) => setForm({ ...form, ai_quality_weighting: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Min quality score (0-100)"
                  value={form.ai_min_quality_score}
                  onChange={(e) => setForm({ ...form, ai_min_quality_score: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  label="Quality multiplier"
                  step="0.1"
                  value={form.ai_quality_multiplier}
                  onChange={(e) => setForm({ ...form, ai_quality_multiplier: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Completion Bonus" subtitle="Bonus points for finishing a screenplay" icon={<Settings className="h-5 w-5" />} />
            <div className="mt-4 space-y-3 p-5 pt-0">
              <Checkbox
                label="Enable completion bonus"
                checked={form.completion_bonus_enabled}
                onChange={(v) => setForm({ ...form, completion_bonus_enabled: v })}
              />
              <div className="max-w-xs">
                <Input
                  type="number"
                  label="Completion bonus points"
                  value={form.completion_bonus_points}
                  onChange={(e) => setForm({ ...form, completion_bonus_points: Number(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Version Notes" subtitle="Describe what changed in this version" icon={<Plus className="h-5 w-5" />} />
            <div className="mt-4 p-5 pt-0">
              <Input
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Increased feedback bonus for early stops"
              />
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleCreateVersion} disabled={saving} loading={saving} icon={saving ? undefined : <Save className="h-4 w-4" />}>
              {saving ? 'Saving...' : 'Create New Version'}
            </Button>
            <Button variant="ghost" onClick={syncFormFromActive}>
              Reset to Current Active
            </Button>
          </div>
        </div>
      )}

      {/* Version History Tab */}
      {tab === 'history' && (
        <div>
          {versions.length === 0 ? (
            <EmptyState icon={<History className="h-7 w-7" />} title="No versions yet" description="Algorithm versions will appear here once created." />
          ) : (
            <div className="space-y-4">
              {versions.map((v) => (
                <Card key={v.id}>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-foreground">Version {v.version_number}</h3>
                          {v.version_number === versions[0]?.version_number && (
                            <StatusBadge status="Active" variant="success" />
                          )}
                        </div>
                        <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                          Activated {new Date(v.activated_at).toLocaleString()} by {v.activated_by ? 'Admin' : 'System'}
                        </p>
                        {v.notes && <p className="mt-2 text-sm text-foreground">{v.notes}</p>}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div className=" bg-secondary px-3 py-2">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Credit Threshold</span>
                        <p className="font-semibold text-foreground">{v.credit_threshold}</p>
                      </div>
                      <div className=" bg-secondary px-3 py-2">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Points per Page</span>
                        <p className="font-semibold text-foreground">{v.points_per_page}</p>
                      </div>
                      <div className=" bg-secondary px-3 py-2">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Feedback Bonus</span>
                        <p className="font-semibold text-foreground">{v.feedback_starting_bonus} - {v.feedback_minimum_bonus}</p>
                      </div>
                      <div className=" bg-secondary px-3 py-2">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Completion Bonus</span>
                        <p className="font-semibold text-foreground">{v.completion_bonus_enabled ? `${v.completion_bonus_points} pts` : 'Disabled'}</p>
                      </div>
                      <div className=" bg-secondary px-3 py-2">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Time Contribution</span>
                        <p className="font-semibold text-foreground">{v.time_contribution_enabled ? `${v.minutes_per_interval} min = ${v.points_per_time_interval} pts` : 'Disabled'}</p>
                      </div>
                      <div className=" bg-secondary px-3 py-2">
                        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">AI Quality</span>
                        <p className="font-semibold text-foreground">{v.ai_quality_enabled ? `Min ${v.ai_min_quality_score}` : 'Disabled'}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suspicious Activity Tab */}
      {tab === 'suspicious' && (
        <div>
          {suspicious.length === 0 ? (
            <EmptyState icon={<Check className="h-7 w-7" />} title="No suspicious activity" description="Flagged reader behaviour will appear here for review." tone="encouraging" />
          ) : (
            <Table
              data={suspicious}
              rowKey={(s) => s.id}
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  render: (s) => (
                    <span className="font-mono text-2xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                  ),
                },
                {
                  key: 'type',
                  header: 'Detection Type',
                  render: (s) => (
                    <span className="text-sm font-medium text-foreground">{s.detection_type}</span>
                  ),
                },
                {
                  key: 'severity',
                  header: 'Severity',
                  render: (s) => (
                    <StatusBadge status={s.severity} variant={s.severity === 'high' ? 'error' : s.severity === 'medium' ? 'warning' : 'success'} />
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: (s) => (
                    <span className="text-sm text-muted-foreground">{s.description}</span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (s) => (
                    s.resolved ? (
                      <StatusBadge status="Resolved" variant="success" />
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleResolveFlag(s.id)}>
                        Resolve
                      </Button>
                    )
                  ),
                },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
