import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FileText, Upload, Archive, Trash2, RotateCcw, Pencil, History,
  Eye, CheckCircle, Clock, Users, TrendingUp, Activity as ActivityIcon,
  X, Save, GitCompare, BarChart3, MessageSquareText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchScreenplay, fetchVersions, uploadNewVersion, uploadScreenplayFile,
  updateScreenplay, updateScreenplayStatus, softDeleteScreenplay,
  archiveScreenplay, restoreScreenplay, fetchScreenplayActivity,
  fetchStatusHistory, getScreenplayFileUrl,
} from '@/lib/writer';
import { ScreenplayStatusBadge, FORMAT_LABELS, SCREENPLAY_STATUSES } from '@/components/app/ScreenplayStatus';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { GENRE_OPTIONS, COUNTRIES } from '@/lib/constants';
import { FORMAT_OPTIONS } from '@/components/app/ScreenplayStatus';
import { fetchEngagementReport, parseReportData } from '@/lib/engagement';
import { EngagementOverview, RetentionChart, ConfidenceCard } from '@/components/engagement/EngagementComponents';
import type { Screenplay, ScreenplayVersion, ScreenplayActivity as ActivityItem, ScreenplayStatusHistory, ScreenplayFormat, ScreenplayStatus, EngagementReportData } from '@/types/database';

export function ScreenplayDetailPage() {
  const { screenplayId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [versions, setVersions] = useState<ScreenplayVersion[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<ScreenplayStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(searchParams.get('edit') === '1');
  const [showUpload, setShowUpload] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'revisions' | 'activity' | 'analytics'>('overview');

  useEffect(() => {
    if (screenplayId) load();
  }, [screenplayId]);

  async function load() {
    if (!screenplayId) return;
    setLoading(true);
    const [sp, vers, act, hist] = await Promise.all([
      fetchScreenplay(screenplayId),
      fetchVersions(screenplayId),
      fetchScreenplayActivity(screenplayId),
      fetchStatusHistory(screenplayId),
    ]);
    setScreenplay(sp);
    setVersions(vers);
    setActivity(act);
    setStatusHistory(hist);
    setLoading(false);
  }

  async function handleStatusChange(status: ScreenplayStatus) {
    if (!screenplay || !profile) return;
    await updateScreenplayStatus(screenplay.id, profile.id, status);
    load();
  }

  async function handleArchive() {
    if (!screenplay || !profile) return;
    await archiveScreenplay(screenplay.id, profile.id);
    load();
  }

  async function handleRestore() {
    if (!screenplay || !profile) return;
    await restoreScreenplay(screenplay.id, profile.id);
    load();
  }

  async function handleDelete() {
    if (!screenplay || !profile) return;
    await softDeleteScreenplay(screenplay.id, profile.id);
    navigate('/app/screenplays');
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  if (!screenplay) {
    return (
      <div>
        <PageHeader label="Screenplay" title="Not Found" description="This screenplay may have been deleted or you may not have access." backTo="/app/screenplays" backLabel="Back to My Screenplays" />
        <EmptyState icon={<FileText className="h-7 w-7" />} title="Screenplay not found" description="This screenplay may have been deleted or you may not have access." action={<Link to="/app/screenplays"><Button>Back to My Screenplays</Button></Link>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Screenplay"
        title={screenplay.title}
        description={screenplay.logline || undefined}
        backTo="/app/screenplays"
        backLabel="Back to My Screenplays"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4" /> Edit</Button>
            <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}><Upload className="h-4 w-4" /> New Revision</Button>
            {screenplay.is_archived ? (
              <Button variant="outline" size="sm" onClick={handleRestore}><RotateCcw className="h-4 w-4" /> Restore</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleArchive}><Archive className="h-4 w-4" /> Archive</Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
          </div>
        }
      />

      {/* Status & meta badges */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ScreenplayStatusBadge status={screenplay.status} />
        <span className="inline-flex items-center  rounded-lg border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{FORMAT_LABELS[screenplay.format]}</span>
        <span className="inline-flex items-center  rounded-lg border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{screenplay.genre}</span>
        {screenplay.page_count && <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.page_count} pages</span>}
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Draft v{screenplay.draft_number}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['overview', 'revisions', 'activity', 'analytics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Metadata" icon={<FileText className="h-5 w-5" />} />
              <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2">
                <MetaItem label="Title" value={screenplay.title} />
                <MetaItem label="Format" value={FORMAT_LABELS[screenplay.format]} />
                <MetaItem label="Genre" value={screenplay.genre} />
                <MetaItem label="Language" value={screenplay.language} />
                <MetaItem label="Country" value={screenplay.country} />
                <MetaItem label="Estimated Budget" value={screenplay.estimated_budget || 'Not set'} />
                <MetaItem label="Draft Number" value={`v${screenplay.draft_number}`} />
                <MetaItem label="Page Count" value={screenplay.page_count ? `${screenplay.page_count} pages` : 'Not detected'} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Status & Timeline" icon={<Clock className="h-5 w-5" />} />
              <div className="p-5 pt-0 mt-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Current Status</label>
                <select
                  value={screenplay.status}
                  onChange={(e) => handleStatusChange(e.target.value as ScreenplayStatus)}
                  className="input-field"
                >
                  {SCREENPLAY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="mt-4">
                  <SectionLabel className="mb-2">Status History</SectionLabel>
                  {statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status changes recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {statusHistory.slice(0, 5).map((h) => (
                        <div key={h.id} className="flex items-center gap-2 text-xs">
                          <div className="flex h-6 w-6 items-center justify-center  bg-secondary text-secondary-foreground">
                            <CheckCircle className="h-3 w-3" />
                          </div>
                          <span className="text-foreground">{h.from_status ? `${h.from_status.replace(/_/g, ' ')} → ` : ''}{h.to_status.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground">{new Date(h.changed_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Uploaded: <span className="text-foreground">{new Date(screenplay.created_at).toLocaleDateString()}</span></p>
                  <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Last Updated: <span className="text-foreground">{new Date(screenplay.updated_at).toLocaleDateString()}</span></p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'revisions' && (
          <Card>
            <CardHeader
              title="Revision History"
              subtitle="Upload unlimited revisions. Only one draft is active for reader review."
              icon={<History className="h-5 w-5" />}
              action={<Button size="sm" onClick={() => setShowUpload(true)}><Upload className="h-4 w-4" /> New Revision</Button>}
            />
            <div className="p-5 pt-0 mt-4">
              {versions.length === 0 ? (
                <EmptyState icon={<History className="h-7 w-7" />} title="No revisions yet" description="Upload your first revision to get started." />
              ) : (
                <div className="space-y-2">
                  {versions.map((v) => (
                    <div key={v.id} className={`flex items-center gap-3  rounded-xl border border-border bg-background p-4 ${v.is_archived ? 'opacity-60' : ''}`}>
                      <div className="flex h-9 w-9 items-center justify-center  bg-secondary text-secondary-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">Draft {v.draft_number}</p>
                          {v.is_active && <StatusBadge status="Active" variant="success" />}
                          {v.is_archived && <StatusBadge status="Archived" variant="neutral" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(v.uploaded_at).toLocaleDateString()}
                          {v.page_count && ` · ${v.page_count} pages`}
                          {v.file_size_bytes && ` · ${(v.file_size_bytes / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                        {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={getScreenplayFileUrl(v.file_path)} target="_blank" rel="noopener noreferrer" className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="View PDF">
                          <Eye className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card>
            <CardHeader title="Activity Timeline" icon={<ActivityIcon className="h-5 w-5" />} />
            <div className="p-5 pt-0 mt-4">
              {activity.length === 0 ? (
                <EmptyState icon={<ActivityIcon className="h-7 w-7" />} title="No activity yet" description="Activity from uploads, revisions, and reviews will appear here." />
              ) : (
                <div className="space-y-3">
                  {activity.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center  bg-secondary text-secondary-foreground">
                        <ActivityIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                        <p className="mt-0.5 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'analytics' && (
          <ScreenplayAnalyticsTab screenplayId={screenplay.id} />
        )}
      </div>

      {showEdit && <EditModal screenplay={screenplay} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />}
      {showUpload && <UploadRevisionModal screenplayId={screenplay.id} draftNumber={screenplay.draft_number} onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); load(); }} />}
      <ConfirmDialog
        open={showDelete}
        title="Delete Screenplay"
        message={`Are you sure you want to delete "${screenplay.title}"? This is a soft delete — it can be restored later.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function EditModal({ screenplay, onClose, onSaved }: { screenplay: Screenplay; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: screenplay.title,
    logline: screenplay.logline || '',
    genre: screenplay.genre,
    format: screenplay.format,
    estimated_budget: screenplay.estimated_budget || '',
    language: screenplay.language,
    country: screenplay.country,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateScreenplay(screenplay.id, form);
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={true} onClose={onClose} title="Edit Screenplay" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Logline</label>
          <textarea required value={form.logline} onChange={(e) => setForm({ ...form, logline: e.target.value })} rows={2} className="input-field resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Genre</label>
            <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="input-field">
              {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Format</label>
            <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as ScreenplayFormat })} className="input-field">
              {FORMAT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Estimated Budget</label>
            <input value={form.estimated_budget} onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Language</label>
            <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Country</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input-field">
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function UploadRevisionModal({ screenplayId, draftNumber, onClose, onUploaded }: { screenplayId: string; draftNumber: number; onClose: () => void; onUploaded: () => void }) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const newDraft = draftNumber + 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !file) { setError('Please select a PDF file.'); return; }
    setUploading(true);
    setError(null);
    try {
      const { path, size } = await uploadScreenplayFile(profile.id, screenplayId, file);
      await uploadNewVersion(screenplayId, profile.id, {
        draft_number: newDraft,
        file_path: path,
        file_size_bytes: size,
        page_count: null,
        notes: notes || undefined,
      });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Upload New Revision" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className=" bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          New draft number: <span className="font-semibold">v{newDraft}</span> (current: v{draftNumber})
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">PDF File</label>
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center  border-2 border-dashed border-border py-8 transition-colors hover:border-primary/40 hover:bg-surface-hover"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Click to select a PDF</p>
            </div>
          ) : (
            <div className="flex items-center gap-3  rounded-xl border border-border bg-background p-3">
              <FileText className="h-5 w-5 text-success" />
              <span className="flex-1 text-sm text-foreground">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-muted-foreground hover:text-error"><X className="h-4 w-4" /></button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Revision Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-field resize-none" placeholder="What changed in this draft?" />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={uploading || !file}>{uploading ? 'Uploading...' : 'Upload Revision'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ScreenplayAnalyticsTab({ screenplayId }: { screenplayId: string }) {
  const [report, setReport] = useState<EngagementReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const rep = await fetchEngagementReport(screenplayId);
      setReport(parseReportData(rep));
      setLoading(false);
    }
    load();
  }, [screenplayId]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin  border-2 border-primary border-t-transparent" /></div>;

  if (!report) return <EmptyState icon={<TrendingUp className="h-7 w-7" />} title="No analytics yet" description="Engagement analytics will appear here once readers start reviewing your screenplay." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link to={`/app/screenplays/${screenplayId}/report`}><Button size="sm" variant="outline"><BarChart3 className="h-4 w-4" /> Full Report</Button></Link>
        <Link to={`/app/screenplays/${screenplayId}/comments`}><Button size="sm" variant="outline"><MessageSquareText className="h-4 w-4" /> Reader Comments</Button></Link>
        <Link to={`/app/screenplays/${screenplayId}/compare`}><Button size="sm" variant="outline"><GitCompare className="h-4 w-4" /> Compare Revisions</Button></Link>
      </div>
      <EngagementOverview report={report} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RetentionChart report={report} />
        <ConfidenceCard report={report} />
      </div>
    </div>
  );
}
