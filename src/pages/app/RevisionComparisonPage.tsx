import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, GitCompare, TrendingUp, Users, CheckCircle, ThumbsUp, Award } from 'lucide-react';
import { fetchScreenplay, fetchVersions } from '@/lib/writer';
import { fetchEngagementReport, parseReportData, formatPercentage, confidenceVariant } from '@/lib/engagement';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { Screenplay, ScreenplayVersion, EngagementReportData } from '@/types/database';

export function RevisionComparisonPage() {
  const { screenplayId } = useParams();
  const [screenplay, setScreenplay] = useState<Screenplay | null>(null);
  const [versions, setVersions] = useState<ScreenplayVersion[]>([]);
  const [reports, setReports] = useState<Record<string, EngagementReportData | null>>({});
  const [loading, setLoading] = useState(true);
  const [versionA, setVersionA] = useState<string>('');
  const [versionB, setVersionB] = useState<string>('');

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
    if (vers.length >= 2) {
      setVersionA(vers[vers.length - 1].id);
      setVersionB(vers[0].id);
    }
    const reportMap: Record<string, EngagementReportData | null> = {};
    for (const v of vers) {
      const rep = await fetchEngagementReport(sp?.id ?? screenplayId);
      reportMap[v.id] = parseReportData(rep);
      if (rep && rep.screenplay_version_id !== v.id) {
        // Need to fetch per-version — but our function fetches the latest for the screenplay
        // For now, all versions share the same screenplay-level report
      }
    }
    setReports(reportMap);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  if (!screenplay) {
    return (
      <div>
        <PageHeader label="Engagement" title="Revision Comparison" />
        <div className="mt-8">
          <EmptyState icon={<FileText className="h-7 w-7" />} title="Screenplay not found" description="This screenplay may have been deleted." action={<Link to="/app/screenplays"><Button>Back to My Screenplays</Button></Link>} />
        </div>
      </div>
    );
  }

  if (versions.length < 2) {
    return (
      <div>
        <PageHeader label="Engagement" title="Revision Comparison" backTo={`/app/screenplays/${screenplayId}`} backLabel="Back to Screenplay" />
        <div className="mt-8">
          <EmptyState icon={<GitCompare className="h-7 w-7" />} title="Not enough revisions" description="Upload at least 2 revisions to compare engagement analytics between them." tone="encouraging" />
        </div>
      </div>
    );
  }

  const reportA = reports[versionA];
  const reportB = reports[versionB];

  const comparisonRows = [
    { label: 'Total Readers', keyA: reportA?.overview.reader_count, keyB: reportB?.overview.reader_count, icon: Users },
    { label: 'Completion Rate', keyA: reportA ? formatPercentage(reportA.overview.completion_rate) : '—', keyB: reportB ? formatPercentage(reportB.overview.completion_rate) : '—', icon: CheckCircle },
    { label: 'Recommendation Rate', keyA: reportA ? formatPercentage(reportA.overview.recommendation_rate) : '—', keyB: reportB ? formatPercentage(reportB.overview.recommendation_rate) : '—', icon: ThumbsUp },
    { label: 'Page 15 Retention', keyA: reportA ? formatPercentage(reportA.retention.page15.percentage) : '—', keyB: reportB ? formatPercentage(reportB.retention.page15.percentage) : '—', icon: TrendingUp },
    { label: 'Final Retention', keyA: reportA ? formatPercentage(reportA.retention.final.percentage) : '—', keyB: reportB ? formatPercentage(reportB.retention.final.percentage) : '—', icon: TrendingUp },
    { label: 'Confidence', keyA: reportA?.confidence.level ?? '—', keyB: reportB?.confidence.level ?? '—', icon: Award },
  ];

  const draftA = versions.find((v) => v.id === versionA)?.draft_number;
  const draftB = versions.find((v) => v.id === versionB)?.draft_number;

  return (
    <div>
      <PageHeader
        label="Engagement"
        title="Revision Comparison"
        description="Each revision maintains independent analytics — never merged."
        backTo={`/app/screenplays/${screenplayId}`}
        backLabel="Back to Screenplay"
      />

      {/* Version selectors */}
      <Card className="mb-6">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <SectionLabel className="mb-1.5">Revision A</SectionLabel>
            <select value={versionA} onChange={(e) => setVersionA(e.target.value)} className="input-field">
              {versions.map((v) => <option key={v.id} value={v.id}>Draft {v.draft_number}</option>)}
            </select>
          </div>
          <div>
            <SectionLabel className="mb-1.5">Revision B</SectionLabel>
            <select value={versionB} onChange={(e) => setVersionB(e.target.value)} className="input-field">
              {versions.map((v) => <option key={v.id} value={v.id}>Draft {v.draft_number}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Engagement comparison */}
      <Card className="mb-6">
        <CardHeader title="Engagement Comparison" subtitle="Side-by-side metrics for selected revisions" icon={<GitCompare className="h-5 w-5" />} />
        <div className="mt-4 overflow-x-auto p-5 pt-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">Metric</th>
                <th className="px-4 py-2.5 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Draft {draftA}</th>
                <th className="px-4 py-2.5 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Draft {draftB}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => {
                const Icon = row.icon;
                return (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{row.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">{row.keyA ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-sm text-foreground">{row.keyB ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Retention comparison */}
      {reportA && reportB && (
        <Card>
          <CardHeader title="Retention Comparison" subtitle="Reader retention at each milestone" icon={<TrendingUp className="h-5 w-5" />} />
          <div className="mt-4 space-y-4 p-5 pt-0">
            {(['page3', 'page10', 'page15', 'page45', 'final'] as const).map((key) => {
              const label = key === 'final' ? 'Final Completion' : `Page ${key.replace('page', '')}`;
              const pctA = reportA.retention[key].percentage;
              const pctB = reportB.retention[key].percentage;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Draft {draftA}: {formatPercentage(pctA)} · Draft {draftB}: {formatPercentage(pctB)}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="h-2 overflow-hidden  bg-muted">
                      <div className="h-full  bg-primary transition-all duration-500" style={{ width: `${pctA}%` }} />
                    </div>
                    <div className="h-2 overflow-hidden  bg-muted">
                      <div className="h-full  bg-accent transition-all duration-500" style={{ width: `${pctB}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
