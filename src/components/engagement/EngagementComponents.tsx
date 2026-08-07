import { TrendingUp, Users, CheckCircle, ThumbsUp, Clock, Activity, Eye, Award } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EngagementReportData, ConfidenceLevel } from '@/types/database';
import { formatReadingTime, formatPercentage, confidenceVariant, RETENTION_MILESTONES } from '@/lib/engagement';

export function EngagementOverview({ report }: { report: EngagementReportData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Readers" value={report.overview.reader_count} icon={<Users className="h-5 w-5" />} />
      <StatCard label="Completion Rate" value={formatPercentage(report.overview.completion_rate)} icon={<CheckCircle className="h-5 w-5" />} color="text-success" />
      <StatCard label="Recommendation Rate" value={formatPercentage(report.overview.recommendation_rate)} icon={<ThumbsUp className="h-5 w-5" />} color="text-accent" />
      <StatCard label="Confidence" value={report.confidence.level.charAt(0).toUpperCase() + report.confidence.level.slice(1)} icon={<Award className="h-5 w-5" />} color="text-primary" />
    </div>
  );
}

export function RetentionChart({ report }: { report: EngagementReportData }) {
  const milestones = RETENTION_MILESTONES.map((m) => ({
    ...m,
    data: report.retention[m.key],
  }));

  return (
    <Card>
      <CardHeader title="Reader Retention" subtitle="How many readers continued past each milestone" icon={<TrendingUp className="h-5 w-5" />} />
      <div className="mt-6 space-y-4">
        {milestones.map((m) => {
          const pct = m.data.percentage;
          const count = m.data.count;
          const total = report.overview.reader_count;
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{m.label}</span>
                <span className="text-muted-foreground">
                  {count} / {total} readers ({formatPercentage(pct)})
                </span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden  bg-muted">
                <div
                  className="h-full  bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ReaderBehaviourCard({ report }: { report: EngagementReportData }) {
  const b = report.reader_behaviour;
  const items = [
    { label: 'Average Reading Time', value: formatReadingTime(b.avg_reading_time_ms), icon: Clock },
    { label: 'Reading Speed', value: b.avg_reading_speed > 0 ? `${b.avg_reading_speed} pg/min` : '—', icon: Activity },
    { label: 'Sessions Per Reader', value: b.avg_sessions_per_reader > 0 ? b.avg_sessions_per_reader.toFixed(1) : '—', icon: Activity },
    { label: 'Return Later %', value: formatPercentage(b.return_later_pct), icon: TrendingUp },
    { label: 'Avg Abandonment Page', value: b.avg_abandonment_page > 0 ? `Page ${Math.round(b.avg_abandonment_page)}` : '—', icon: Eye },
    { label: 'Avg Completion Time', value: formatReadingTime(b.avg_completion_time_ms), icon: Clock },
    { label: 'Recommendation %', value: formatPercentage(b.recommendation_pct), icon: ThumbsUp },
    { label: 'Persistence Score', value: b.persistence_score > 0 ? b.persistence_score.toFixed(2) : '—', icon: Award },
  ];

  return (
    <Card>
      <CardHeader title="Reader Behaviour" subtitle="How readers engaged with this screenplay" icon={<Activity className="h-5 w-5" />} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3">
            <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-secondary-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ReaderBreakdownCard({ report }: { report: EngagementReportData }) {
  const a = report.reader_activity;
  const items = [
    { label: 'Total Readers', value: a.total_readers, color: 'text-foreground' },
    { label: 'Completed Reviews', value: a.completed_reviews, color: 'text-success' },
    { label: 'Abandoned Reads', value: a.abandoned_reads, color: 'text-error' },
    { label: 'Returned Later', value: a.returned_later, color: 'text-warning' },
    { label: 'Industry Readers', value: a.industry_readers, color: 'text-accent' },
    { label: 'Highly Selective', value: a.selective_readers, color: 'text-primary' },
    { label: 'Highly Persistent', value: a.persistent_readers, color: 'text-primary' },
  ];

  return (
    <Card>
      <CardHeader title="Reader Breakdown" subtitle="Who read this screenplay" icon={<Users className="h-5 w-5" />} />
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between  border border-border bg-background px-3 py-2">
            <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className={`font-mono text-sm font-semibold ${color}`}>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ConfidenceCard({ report }: { report: EngagementReportData }) {
  const level = report.confidence.level as ConfidenceLevel;
  return (
    <Card>
      <CardHeader title="Confidence Level" subtitle="How reliable are these metrics?" icon={<Award className="h-5 w-5" />} />
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={level.charAt(0).toUpperCase() + level.slice(1)} variant={confidenceVariant(level)} />
          <span className="text-sm text-muted-foreground">
            {report.sample_size} {report.sample_size === 1 ? 'reader' : 'readers'} · {report.statistical_confidence} statistical confidence
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Why this confidence level?</p>
          {report.confidence.reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-1 h-1.5 w-1.5 shrink-0  bg-primary" />
              {reason}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function RecommendationsCard({ report }: { report: EngagementReportData }) {
  const r = report.recommendations;
  return (
    <Card>
      <CardHeader title="Recommendations" subtitle="Would readers recommend this screenplay?" icon={<ThumbsUp className="h-5 w-5" />} />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className=" border border-success/20 bg-success/5 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-success">{r.yes}</p>
          <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Yes</p>
        </div>
        <div className=" border border-error/20 bg-error/5 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-error">{r.no}</p>
          <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">No</p>
        </div>
        <div className=" border border-accent/20 bg-accent/5 p-4 text-center">
          <p className="font-mono text-2xl font-bold text-accent">{r.unsure}</p>
          <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Unsure</p>
        </div>
      </div>
      <p className="mt-3 font-mono text-2xs text-muted-foreground">
        {r.rate}% of completed readers would recommend this screenplay. Recommendations are audience analysis data and do not affect reader credits.
      </p>
    </Card>
  );
}

export function EmptyReportState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={<TrendingUp className="h-7 w-7" />}
      title="No engagement data yet"
      description={message || "Engagement metrics will appear here once readers start reviewing this screenplay."}
    />
  );
}
