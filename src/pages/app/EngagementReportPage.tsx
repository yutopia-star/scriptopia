import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Download, RefreshCw, MessageSquareText, GitCompare, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchScreenplay, fetchVersions } from '@/lib/writer';
import { fetchEngagementReport, parseReportData, fetchCommentThemes, fetchAISummaries, refreshEngagementReport, AI_SUMMARY_LABELS, COMMENT_THEME_LABELS } from '@/lib/engagement';
import { recordExport } from '@/lib/discovery';
import { EngagementOverview, RetentionChart, ReaderBehaviourCard, ReaderBreakdownCard, ConfidenceCard, RecommendationsCard, EmptyReportState } from '@/components/engagement/EngagementComponents';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScreenplayStatusBadge, FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { Screenplay, ScreenplayVersion, EngagementReportData, CommentTheme, AISummary } from '@/types/database';

export function EngagementReportPage() {
  const { screenplayId } = useParams();
  const { profile } = useAuth();
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [versions, setVersions] = useState<ScreenplayVersion[]>([]);
  const [report, setReport] = useState<EngagementReportData | null>(null);
  const [themes, setThemes] = useState<CommentTheme[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

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
    if (activeVersion) {
      setActiveVersionId(activeVersion.id);
      const rep = await fetchEngagementReport(screenplayId);
      const parsed = parseReportData(rep);
      setReport(parsed);
      if (parsed) {
        const [t, s] = await Promise.all([
          fetchCommentThemes(activeVersion.id),
          fetchAISummaries(activeVersion.id),
        ]);
        setThemes(t);
        setSummaries(s);
      }
    }
    setLoading(false);
  }

  async function handleRefresh() {
    if (!screenplayId || !profile) return;
    setRefreshing(true);
    await refreshEngagementReport(screenplayId);
    await load();
    setRefreshing(false);
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
        <PageHeader label="Engagement Report" title="Screenplay Not Found" description="This screenplay may have been deleted." backTo="/app/screenplays" backLabel="Back to My Screenplays" />
        <EmptyState icon={<FileText className="h-7 w-7" />} title="Screenplay not found" description="This screenplay may have been deleted." action={<Link to="/app/screenplays"><Button>Back to My Screenplays</Button></Link>} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Engagement Report"
        title="Engagement Report"
        description={`${screenplay.title} · ${FORMAT_LABELS[screenplay.format]} · ${screenplay.genre}`}
        backTo={`/app/screenplays/${screenplayId}`}
        backLabel="Back to Screenplay"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            <Link to={`/app/screenplays/${screenplayId}/comments`}>
              <Button variant="outline" size="sm"><MessageSquareText className="h-4 w-4" /> Reader Comments</Button>
            </Link>
            <Link to={`/app/screenplays/${screenplayId}/compare`}>
              <Button variant="outline" size="sm"><GitCompare className="h-4 w-4" /> Compare Revisions</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ScreenplayStatusBadge status={screenplay.status} />
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{FORMAT_LABELS[screenplay.format]}</span>
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.genre}</span>
      </div>

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

          {/* AI Insights */}
          {summaries.length > 0 && (
            <Card>
              <CardHeader title="AI Insights" subtitle="Derived from reader feedback — not quality judgments" icon={<Sparkles className="h-5 w-5" />} />
              <div className="mt-4 space-y-4 p-5 pt-0">
                {summaries.map((s) => (
                  <div key={s.id} className=" rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{AI_SUMMARY_LABELS[s.summary_type] || s.summary_type}</span>
                      <StatusBadge status="AI" variant="neutral" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{s.summary_text}</p>
                    <p className="mt-2 text-xs italic text-muted-foreground">{s.derived_label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Comment Themes */}
          {themes.length > 0 && (
            <Card>
              <CardHeader title="Reader Feedback Themes" subtitle="What readers are talking about" icon={<MessageSquareText className="h-5 w-5" />} />
              <div className="mt-4 space-y-3 p-5 pt-0">
                {themes.map((t) => (
                  <div key={t.id} className=" rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{COMMENT_THEME_LABELS[t.theme_name] || t.theme_name}</span>
                      <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{t.comment_count} {t.comment_count === 1 ? 'comment' : 'comments'}</span>
                    </div>
                    {t.ai_summary && <p className="mt-2 text-sm text-muted-foreground">{t.ai_summary}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
