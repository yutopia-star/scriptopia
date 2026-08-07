import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, Bookmark, HeartHandshake, GitCompare, Sparkles,
  Users, CheckCircle, TrendingUp, Award, Clock, Activity, Eye, Download,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchEngagementReport, parseReportData, fetchCommentThemes, fetchAISummaries, fetchReaderFeedback, formatReadingTime, formatPercentage, confidenceVariant, COMMENT_THEME_LABELS, AI_SUMMARY_LABELS } from '@/lib/engagement';
import { trackScreenplayView, recordExport } from '@/lib/discovery';
import { computeMatch, fetchWatchlists, addToWatchlist, createWatchlist, createIntroRequest } from '@/lib/industry';
import { EngagementOverview, RetentionChart, ReaderBehaviourCard, ReaderBreakdownCard, ConfidenceCard, RecommendationsCard, EmptyReportState } from '@/components/engagement/EngagementComponents';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { Screenplay, EngagementReportData, CommentTheme, AISummary, Watchlist } from '@/types/database';

export function ScreenplayDiscoveryPage() {
  const { screenplayId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [writer, setWriter] = useState<{ username: string } | null>(null);
  const [report, setReport] = useState<EngagementReportData | null>(null);
  const [themes, setThemes] = useState<CommentTheme[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [feedback, setFeedback] = useState<Array<{ id: string; feedback: string; decision: string; recommendation: boolean | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [matchPct, setMatchPct] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [versions, setVersions] = useState<Array<{ id: string; draft_number: number; uploaded_at: string; page_count: number | null }>>([]);

  useEffect(() => {
    if (screenplayId && profile) load();
  }, [screenplayId, profile]);

  async function load() {
    if (!screenplayId || !profile) return;
    setLoading(true);
    const { data: sp } = await supabase.from('screenplays').select('*').eq('id', screenplayId).maybeSingle();
    setScreenplay(sp as Screenplay | null);

    if (sp) {
      const { data: w } = await supabase.from('profiles').select('username').eq('id', sp.writer_id).maybeSingle();
      setWriter(w as { username: string } | null);

      const { data: vers } = await supabase.from('screenplay_versions').select('id, draft_number, uploaded_at, page_count').eq('screenplay_id', screenplayId).order('draft_number', { ascending: false });
      setVersions(vers ?? []);

      const rep = await fetchEngagementReport(screenplayId);
      const parsed = parseReportData(rep);
      setReport(parsed);

      const activeVersion = vers?.find((v: { is_active?: boolean }) => v.is_active) ?? vers?.[0];
      if (activeVersion) {
        const [t, s, fb] = await Promise.all([
          fetchCommentThemes(activeVersion.id),
          fetchAISummaries(activeVersion.id),
          fetchReaderFeedback(screenplayId),
        ]);
        setThemes(t);
        setSummaries(s);
        setFeedback(fb);
      }

      const match = await computeMatch(profile.id, screenplayId);
      setMatchPct(match?.percentage ?? null);

      const wl = await fetchWatchlists(profile.id);
      setWatchlists(wl);

      await trackScreenplayView(profile.id, screenplayId);
    }
    setLoading(false);
  }

  async function handleSave(watchlistId: string) {
    if (!screenplayId) return;
    await addToWatchlist(watchlistId, screenplayId);
    setShowSaveModal(false);
  }

  async function handleCreateAndSave(name: string) {
    if (!profile || !screenplayId) return;
    const wl = await createWatchlist(profile.id, name);
    if (wl) await addToWatchlist(wl.id, screenplayId);
    setShowSaveModal(false);
  }

  async function handleIntro(message: string) {
    if (!profile || !screenplay || !screenplay.writer_id) return;
    await createIntroRequest({
      industryUserId: profile.id,
      writerId: screenplay.writer_id,
      screenplayId: screenplay.id,
      message: message || undefined,
    });
    setShowIntroModal(false);
  }

  async function handleExport() {
    if (!screenplayId || !profile) return;
    await recordExport(profile.id, 'engagement_report', screenplayId);
    window.print();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  if (!screenplay) {
    return (
      <div>
        <PageHeader label="Discover" title="Screenplay Not Found" description="This screenplay may not be available for discovery." backTo="/app/discover" backLabel="Back to Discover" />
        <EmptyState icon={<FileText className="h-7 w-7" />} title="Screenplay not found" description="This screenplay may not be available for discovery." action={<Link to="/app/discover"><Button>Back to Discover</Button></Link>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Discover"
        title={screenplay.title}
        description={screenplay.logline}
        backTo="/app/discover"
        backLabel="Back to Discover"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveModal(true)}><Bookmark className="h-4 w-4" /> Save</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/app/compare?ids=${screenplayId}`)}><GitCompare className="h-4 w-4" /> Compare</Button>
            <Button size="sm" onClick={() => setShowIntroModal(true)}><HeartHandshake className="h-4 w-4" /> Request Introduction</Button>
            <Button variant="ghost" size="sm" onClick={handleExport}><Download className="h-4 w-4" /> Export</Button>
          </div>
        }
      />

      {/* Meta badges */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {matchPct !== null && (
          <div className=" bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {matchPct}% Match
          </div>
        )}
        <span className="inline-flex items-center  rounded-lg border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{FORMAT_LABELS[screenplay.format]}</span>
        <span className="inline-flex items-center  rounded-lg border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{screenplay.genre}</span>
        {screenplay.page_count && <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.page_count} pages</span>}
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.country}</span>
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.language}</span>
        {screenplay.estimated_budget && <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.estimated_budget}</span>}
      </div>

      <p className="mb-6 text-xs text-muted-foreground">Writer contact information is not shown. Use Introduction Requests to connect.</p>

      {/* Engagement Report */}
      {!report ? (
        <EmptyReportState />
      ) : (
        <div className="space-y-6">
          <EngagementOverview report={report} />

          <div className="grid gap-6 lg:grid-cols-2">
            <RetentionChart report={report} />
            <RecommendationsCard report={report} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReaderBehaviourCard report={report} />
            <ReaderBreakdownCard report={report} />
          </div>

          <ConfidenceCard report={report} />

          {/* AI Summary */}
          {summaries.length > 0 && (
            <Card>
              <CardHeader title="AI Summary" subtitle="Derived from reader feedback — not a quality judgment" icon={<Sparkles className="h-5 w-5" />} />
              <div className="mt-4 space-y-3 p-5 pt-0">
                {summaries.map((s) => (
                  <div key={s.id} className=" rounded-xl border border-border bg-background p-4">
                    <span className="text-sm font-semibold text-foreground">{AI_SUMMARY_LABELS[s.summary_type] || s.summary_type}</span>
                    <p className="mt-1 text-sm text-muted-foreground">{s.summary_text}</p>
                    <p className="mt-1 text-xs italic text-muted-foreground">{s.derived_label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Anonymous Reader Feedback */}
          {feedback.length > 0 && (
            <Card>
              <CardHeader title="Anonymous Reader Feedback" subtitle="What readers said about this screenplay" icon={<FileText className="h-5 w-5" />} />
              <div className="mt-4 space-y-3 p-5 pt-0">
                {feedback.slice(0, 10).map((f) => (
                  <div key={f.id} className=" rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{f.decision === 'finished' ? 'Completed Reader' : 'Stopped Reader'}</span>
                      {f.recommendation === true && <StatusBadge status="Recommended" variant="success" />}
                      {f.recommendation === false && <StatusBadge status="Not Recommended" variant="error" />}
                      <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{f.feedback}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Revision History */}
          {versions.length > 0 && (
            <Card>
              <CardHeader title="Revision History" subtitle="Each revision maintains independent analytics" icon={<TrendingUp className="h-5 w-5" />} />
              <div className="mt-4 space-y-2 p-5 pt-0">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3">
                    <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-secondary-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Draft {v.draft_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.uploaded_at).toLocaleDateString()}
                        {v.page_count && ` · ${v.page_count} pages`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Save to Watchlist Modal */}
      {showSaveModal && (
        <Modal open={true} onClose={() => setShowSaveModal(false)} title="Save to Watchlist" maxWidth="max-w-md">
          <div className="space-y-3">
            {watchlists.length > 0 ? (
              watchlists.map((wl) => (
                <button key={wl.id} onClick={() => handleSave(wl.id)} className="flex w-full items-center gap-3  border border-border p-3 text-left transition-colors hover:bg-surface-hover">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{wl.name}</p>
                    {wl.description && <p className="text-xs text-muted-foreground">{wl.description}</p>}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No watchlists yet. Create one below.</p>
            )}
            <CreateWatchlistInline onCreate={handleCreateAndSave} />
          </div>
        </Modal>
      )}

      {/* Introduction Request Modal */}
      {showIntroModal && (
        <IntroRequestModal onClose={() => setShowIntroModal(false)} onSubmit={handleIntro} />
      )}
    </div>
  );
}

function CreateWatchlistInline({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="border-t border-border pt-3">
      <SectionLabel className="mb-2">Create New Watchlist</SectionLabel>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Watchlist name" className="input-field flex-1" />
        <Button size="sm" onClick={() => name && onCreate(name)} disabled={!name}>Create & Save</Button>
      </div>
    </div>
  );
}

function IntroRequestModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (message: string) => void }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal open={true} onClose={onClose} title="Request Introduction" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Request an introduction to this writer. Your contact details will only be shared if the writer accepts your request.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Message (optional)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input-field resize-none" placeholder="Introduce yourself and explain why you are interested in this screenplay..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={submitting} onClick={async () => { setSubmitting(true); await onSubmit(message); setSubmitting(false); onClose(); }}>
            <HeartHandshake className="h-4 w-4" /> Send Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}
