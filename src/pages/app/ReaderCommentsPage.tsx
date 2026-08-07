import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Search, Download, Sparkles, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchScreenplay, fetchVersions } from '@/lib/writer';
import { fetchReaderFeedback, fetchCommentThemes, fetchAISummaries, COMMENT_THEME_LABELS, AI_SUMMARY_LABELS } from '@/lib/engagement';
import { recordExport } from '@/lib/discovery';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ScreenplayStatusBadge, FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { Screenplay, ScreenplayVersion, CommentTheme, AISummary } from '@/types/database';

interface FeedbackItem {
  id: string;
  feedback: string;
  decision: string;
  recommendation: boolean | null;
  created_at: string;
  page_abandoned: number | null;
  stop_reason: string | null;
}

export function ReaderCommentsPage() {
  const { screenplayId } = useParams();
  const { profile } = useAuth();
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [versions, setVersions] = useState<ScreenplayVersion[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [themes, setThemes] = useState<CommentTheme[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTheme, setActiveTheme] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'decision'>('recent');

  useEffect(() => {
    if (screenplayId) load();
  }, [screenplayId]);

  async function load() {
    if (!screenplayId) return;
    setLoading(true);
    const [sp, vers] = await Promise.all([
      fetchScreenplay(screenplayId),
      fetchVersions(screenplayId),
    ]);
    setScreenplay(sp);
    setVersions(vers);
    const activeVersion = vers.find((v) => v.is_active) ?? vers[0];
    const [fb, t, s] = await Promise.all([
      fetchReaderFeedback(screenplayId),
      activeVersion ? fetchCommentThemes(activeVersion.id) : Promise.resolve([]),
      activeVersion ? fetchAISummaries(activeVersion.id) : Promise.resolve([]),
    ]);
    setFeedback(fb as FeedbackItem[]);
    setThemes(t);
    setSummaries(s);
    setLoading(false);
  }

  async function handleExport() {
    if (!screenplayId || !profile) return;
    await recordExport(profile.id, 'reader_comments', screenplayId);
    window.print();
  }

  const filtered = useMemo(() => {
    let result = feedback;
    if (activeTheme !== 'all') {
      const themeCommentIds = new Set<string>();
      // We don't have the join table data, so filter by keyword matching
      const themeKeywords: Record<string, string[]> = {
        opening: ['opening', 'begin', 'start', 'first page', 'first act', 'inciting'],
        dialogue: ['dialogue', 'conversation', 'speech', 'voice', 'monologue', 'lines'],
        characters: ['character', 'protagonist', 'antagonist', 'arc', 'development', 'motivation'],
        pacing: ['pacing', 'slow', 'fast', 'rushed', 'drags', 'momentum', 'speed'],
        structure: ['structure', 'plot', 'story', 'narrative', 'act', 'climax', 'resolution'],
        formatting: ['format', 'formatting', 'slugline', 'action line', 'parenthetical'],
        ending: ['ending', 'conclusion', 'finale', 'climax', 'resolve', 'payoff', 'twist'],
        general: [],
      };
      const keywords = themeKeywords[activeTheme] ?? [];
      result = result.filter((f) => {
        const text = f.feedback.toLowerCase();
        return keywords.length === 0 || keywords.some((kw) => text.includes(kw));
      });
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.feedback.toLowerCase().includes(q));
    }
    result = [...result];
    if (sortBy === 'recent') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === 'decision') result.sort((a, b) => a.decision.localeCompare(b.decision));
    return result;
  }, [feedback, activeTheme, search, sortBy]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  if (!screenplay) {
    return (
      <div>
        <PageHeader label="Engagement" title="Reader Comments" />
        <div className="mt-8">
          <EmptyState icon={<FileText className="h-7 w-7" />} title="Screenplay not found" description="This screenplay may have been deleted." action={<Link to="/app/screenplays"><Button>Back to My Screenplays</Button></Link>} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Engagement"
        title="Reader Comments"
        description="Anonymized reader feedback and AI-generated theme summaries."
        backTo={`/app/screenplays/${screenplayId}`}
        backLabel="Back to Screenplay"
        actions={<Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /> Export PDF</Button>}
      />

      {/* Screenplay context */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-foreground">{screenplay.title}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{FORMAT_LABELS[screenplay.format]}</span>
        <ScreenplayStatusBadge status={screenplay.status} />
      </div>

      {/* AI Theme Summaries */}
      {themes.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="AI Theme Summaries" subtitle="Generated from reader feedback — maintaining reader anonymity" icon={<Sparkles className="h-5 w-5" />} />
          <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2">
            {themes.map((t) => (
              <div key={t.id} className=" rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{COMMENT_THEME_LABELS[t.theme_name] || t.theme_name}</span>
                  <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{t.comment_count} {t.comment_count === 1 ? 'comment' : 'comments'}</span>
                </div>
                {t.ai_summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.ai_summary}</p>}
                <p className="mt-2 text-xs italic text-muted-foreground">Derived from reader feedback — not a quality judgment.</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Summaries */}
      {summaries.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="AI Summaries" subtitle="Generated insights from reader behaviour" icon={<Sparkles className="h-5 w-5" />} />
          <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2">
            {summaries.map((s) => (
              <div key={s.id} className=" rounded-xl border border-border bg-background p-4">
                <span className="text-sm font-semibold text-foreground">{AI_SUMMARY_LABELS[s.summary_type] || s.summary_type}</span>
                {s.summary_text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.summary_text}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select value={activeTheme} onChange={(e) => setActiveTheme(e.target.value)} className="input-field sm:w-48">
            <option value="all">All Themes</option>
            {Object.entries(COMMENT_THEME_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'decision')} className="input-field sm:w-40">
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="decision">By Decision</option>
          </select>
        </div>
      </Card>

      {/* Comments */}
      <div>
        <SectionLabel className="mb-3">Reader Feedback</SectionLabel>
        {filtered.length === 0 ? (
          <EmptyState icon={<MessageSquareText className="h-7 w-7" />} title="No comments found" description={feedback.length === 0 ? "Reader feedback will appear here once reviews are submitted." : "No comments match your filters."} />
        ) : (
          <div className="space-y-3">
            {filtered.map((f) => (
              <Card key={f.id}>
                <div className="flex items-start gap-3 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center  ${f.decision === 'finished' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                        {f.decision === 'finished' ? 'Completed Reader' : 'Stopped Reader'}
                      </span>
                      {f.recommendation === true && <StatusBadge status="Recommended" variant="success" />}
                      {f.recommendation === false && <StatusBadge status="Not Recommended" variant="error" />}
                      {f.recommendation === null && f.decision === 'finished' && <StatusBadge status="Unsure" variant="neutral" />}
                      <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{f.feedback}</p>
                    {f.decision === 'stopped' && f.page_abandoned && (
                      <p className="mt-2 text-xs text-muted-foreground">Stopped at page {f.page_abandoned}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
