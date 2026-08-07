import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Coins, Eye, TrendingUp, Bell, Plus, Upload, BarChart3, Activity, Sparkles, Users, CheckCircle, ThumbsUp, Award, MessageSquareText, ArrowRight, Play, Clock, Flame, PenLine } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { DashboardWidget } from '@/components/app/DashboardWidget';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { RetentionCurve } from '@/components/ui/RetentionCurve';
import { ConfidenceGauge } from '@/components/ui/ConfidenceGauge';
import { EngagementFunnel } from '@/components/ui/EngagementFunnel';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { fetchCredits } from '@/lib/writer';
import { fetchContributionBalance, fetchActiveAlgorithm } from '@/lib/reader';
import { fetchAISummaries, AI_SUMMARY_LABELS, formatPercentage, confidenceVariant } from '@/lib/engagement';
import type { EngagementReportData, AISummary, ReaderContributionBalance, ReaderContributionAlgorithm } from '@/types/database';

interface ScreenplayWithMetrics {
  id: string;
  title: string;
  logline: string;
  genre: string;
  format: string;
  status: string;
  updated_at: string;
  metrics: { reader_count: number; completion_rate: number; recommendation_rate: number; confidence_level: string } | null;
}

export function WriterDashboard() {
  const { profile } = useAuth();
  const { notifications } = useNotifications();
  const [stats, setStats] = useState({ screenplays: 0, inReview: 0, credits: 0, reviews: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; title: string; description: string | null; created_at: string; event_type: string }>>([]);
  const [screenplays, setScreenplays] = useState<ScreenplayWithMetrics[]>([]);
  const [latestReport, setLatestReport] = useState<EngagementReportData | null>(null);
  const [latestScreenplayTitle, setLatestScreenplayTitle] = useState<string>('');
  const [aiSummaries, setAiSummaries] = useState<AISummary[]>([]);
  const [contribution, setContribution] = useState<ReaderContributionBalance | null>(null);
  const [algorithm, setAlgorithm] = useState<ReaderContributionAlgorithm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);

      const { data: sps } = await supabase
        .from('screenplays')
        .select('id, title, logline, genre, format, status, updated_at')
        .eq('writer_id', profile.id)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      const spList = sps ?? [];
      const inReview = spList.filter((s: { status: string }) => s.status === 'in_review').length;

      const spsWithMetrics: ScreenplayWithMetrics[] = await Promise.all(
        spList.map(async (sp: { id: string; title: string; logline: string; genre: string; format: string; status: string; updated_at: string }) => {
          const { data: m } = await supabase
            .from('screenplay_discovery_metrics')
            .select('reader_count, completion_rate, recommendation_rate, confidence_level')
            .eq('screenplay_id', sp.id)
            .maybeSingle();
          return { ...sp, metrics: m as ScreenplayWithMetrics['metrics'] };
        }),
      );
      setScreenplays(spsWithMetrics);

      const credits = await fetchCredits(profile.id);
      const cb = await fetchContributionBalance(profile.id);
      const algo = await fetchActiveAlgorithm();
      setContribution(cb);
      setAlgorithm(algo);

      const { data: activity } = await supabase
        .from('screenplay_activity')
        .select('id, title, description, created_at, event_type')
        .eq('writer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentActivity(activity ?? []);

      if (spsWithMetrics.length > 0) {
        const { data: report } = await supabase
          .from('engagement_reports')
          .select('report_data, screenplay_id')
          .eq('screenplay_id', spsWithMetrics[0].id)
          .order('computed_at', { ascending: false })
          .maybeSingle();
        if (report?.report_data) {
          setLatestReport(report.report_data as EngagementReportData);
          setLatestScreenplayTitle(spsWithMetrics[0].title);
          const { data: versions } = await supabase
            .from('screenplay_versions')
            .select('id')
            .eq('screenplay_id', spsWithMetrics[0].id)
            .eq('is_active', true)
            .maybeSingle();
          if (versions) {
            const summaries = await fetchAISummaries(versions.id);
            setAiSummaries(summaries);
          }
        }
      }

      const totalReviews = spsWithMetrics.reduce((sum: number, sp: ScreenplayWithMetrics) => sum + (sp.metrics?.reader_count ?? 0), 0);
      setStats({
        screenplays: spList.length,
        inReview,
        credits: cb?.available_credits ?? credits?.balance ?? 0,
        reviews: totalReviews,
      });
      setLoading(false);
    }
    load();
  }, [profile]);

  const recentNotifs = notifications.slice(0, 4);
  const activeScreenplays = screenplays.filter((s) => s.status === 'in_review' || s.status === 'validated');
  const trendingMetrics = screenplays.filter((s) => s.metrics && s.metrics.reader_count > 0);
  const currentPoints = contribution?.current_points ?? 0;
  const threshold = algorithm?.credit_threshold ?? 1000;
  const progressPct = threshold > 0 ? Math.min((currentPoints / threshold) * 100, 100) : 0;

  if (loading) return <DashboardSkeleton />;

  const featuredScreenplay = screenplays[0];
  const retentionData = latestReport?.page_retention
    ? latestReport.page_retention.map((r: { retention_rate: number }) => Math.round(r.retention_rate * 100))
    : [100, 85, 72, 60, 45];

  const funnelSteps = latestReport
    ? [
        { label: 'Readers Started', value: latestReport.overview.reader_count, pct: 100 },
        { label: 'Reached Midpoint', value: Math.round(latestReport.overview.reader_count * (latestReport.overview.completion_rate / 100 + 0.15)), pct: Math.round(70 + latestReport.overview.completion_rate * 0.3) },
        { label: 'Completed', value: Math.round(latestReport.overview.reader_count * (latestReport.overview.completion_rate / 100)), pct: latestReport.overview.completion_rate },
        { label: 'Recommended', value: Math.round(latestReport.overview.reader_count * (latestReport.overview.recommendation_rate / 100)), pct: latestReport.overview.recommendation_rate },
      ]
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome panel */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 shadow-soft">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72  bg-accent/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64  bg-tertiary/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <PenLine className="h-3 w-3 text-accent" /> Writer Workspace
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Welcome back, {profile?.username}</h1>
            <p className="mt-2 text-sm text-muted-foreground">See how audiences are responding to your stories.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/app/screenplays"><Button size="sm"><Upload className="h-4 w-4" /> Upload Screenplay</Button></Link>
              <Link to="/app/credits"><Button variant="outline" size="sm"><Coins className="h-4 w-4" /> View Credits</Button></Link>
            </div>
          </div>
          {featuredScreenplay && (
            <div className="hidden sm:block">
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Featured Screenplay</p>
                <p className="mt-1.5 font-display text-lg font-semibold text-foreground line-clamp-1">{featuredScreenplay.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{featuredScreenplay.logline}</p>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge status={featuredScreenplay.status} variant={featuredScreenplay.status === 'in_review' ? 'info' : 'success'} />
                  {featuredScreenplay.metrics && (
                    <span className="text-xs text-muted-foreground">{featuredScreenplay.metrics.reader_count} readers</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animated stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedStat label="Screenplays" value={stats.screenplays} icon={<FileText className="h-5 w-5" />} />
        <AnimatedStat label="In Review" value={stats.inReview} icon={<Eye className="h-5 w-5" />} color="text-warning" />
        <AnimatedStat label="Upload Credits" value={stats.credits} icon={<Coins className="h-5 w-5" />} color="text-accent" />
        <AnimatedStat label="Total Readers" value={stats.reviews} icon={<Users className="h-5 w-5" />} color="text-tertiary" />
      </div>

      {/* Engagement Analytics — Retention Curve + Confidence Gauge */}
      {latestReport && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Reader Retention Curve"
              subtitle={`How readers stayed engaged with ${latestScreenplayTitle}`}
              icon={<TrendingUp className="h-5 w-5" />}
              action={<Link to="/app/screenplays"><Button size="sm" variant="ghost">Details <ArrowRight className="h-4 w-4" /></Button></Link>}
            />
            <div className="p-5 pt-2">
              <RetentionCurve data={retentionData} />
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">What this means:</span>
                <span className="text-xs text-foreground">
                  {latestReport.overview.completion_rate >= 70
                    ? 'Strong retention — readers are engaged throughout.'
                    : latestReport.overview.completion_rate >= 40
                      ? 'Moderate retention — some readers drop off mid-way.'
                      : 'Early drop-off — consider revisiting the opening pages.'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Confidence Score" subtitle="Evidence strength" icon={<Award className="h-5 w-5" />} />
            <div className="flex flex-col items-center p-5 pt-2">
              <ConfidenceGauge level={latestReport.confidence.level} score={latestReport.confidence.score ?? (latestReport.confidence.level === 'high' ? 85 : latestReport.confidence.level === 'medium' ? 55 : 25)} size={140} />
              <div className="mt-4 w-full rounded-lg bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {latestReport.confidence.level === 'high'
                    ? 'Reliable evidence — decisions can be made with confidence.'
                    : latestReport.confidence.level === 'medium'
                      ? 'Building evidence — more readers will strengthen the signal.'
                      : 'Limited data — more reader engagement needed.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Engagement Funnel */}
      {latestReport && funnelSteps.length > 0 && (
        <Card>
          <CardHeader title="Engagement Funnel" subtitle="Reader journey from start to recommendation" icon={<BarChart3 className="h-5 w-5" />} />
          <div className="p-5 pt-2">
            <EngagementFunnel steps={funnelSteps} />
          </div>
        </Card>
      )}

      {/* AI Insights */}
      {aiSummaries.length > 0 && (
        <Card>
          <CardHeader title="AI Insights" subtitle="Derived from reader feedback — not quality judgments" icon={<Sparkles className="h-5 w-5" />} />
          <div className="grid gap-4 p-5 pt-2 sm:grid-cols-3">
            {aiSummaries.slice(0, 3).map((s) => (
              <div key={s.id} className="border border-border bg-background p-4 transition-colors hover:border-accent/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">{AI_SUMMARY_LABELS[s.summary_type] || s.summary_type}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.summary_text}</p>
                <p className="mt-2 text-xs italic text-muted-foreground/70">{s.derived_label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Contribution progress */}
      {contribution && algorithm && (
        <Card>
          <CardHeader title="Submission Credit Progress" subtitle="Earn upload credits through reading contribution" icon={<TrendingUp className="h-5 w-5" />} action={<Link to="/app/credits"><Button size="sm" variant="ghost">View Details <ArrowRight className="h-4 w-4" /></Button></Link>} />
          <div className="p-5 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentPoints} / {threshold} points</span>
              <span className="font-display text-lg font-semibold text-foreground">{Math.round(progressPct)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden bg-muted">
              <div className="h-full bg-gradient-to-r from-tertiary to-accent transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {progressPct >= 100 ? 'You have earned a new upload credit!' : `${threshold - currentPoints} more points to earn your next credit.`}
            </p>
          </div>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardWidget
          title="Active Screenplays"
          subtitle="Currently being reviewed by readers"
          icon={<FileText className="h-5 w-5" />}
          action={{ label: 'View all', to: '/app/screenplays' }}
        >
          {activeScreenplays.length === 0 ? (
            <EmptyState icon={<FileText className="h-7 w-7" />} title="No active screenplays yet" description="Once your screenplay enters the reading pool, engagement data will appear here — showing how readers are responding." tone="guiding" action={<Link to="/app/screenplays"><Button size="sm"><Plus className="h-4 w-4" /> Upload Screenplay</Button></Link>} />
          ) : (
            <div className="space-y-2.5">
              {activeScreenplays.slice(0, 4).map((sp) => (
                <Link key={sp.id} to={`/app/screenplays/${sp.id}`} className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all duration-300 hover:border-accent/20 hover:shadow-soft">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{sp.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{sp.genre}</span>
                      {sp.metrics && <span>· {sp.metrics.reader_count} readers</span>}
                      {sp.metrics && <span>· {formatPercentage(sp.metrics.completion_rate)} completion</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Trending Metrics"
          subtitle="Screenplays with reader engagement"
          icon={<TrendingUp className="h-5 w-5" />}
        >
          {trendingMetrics.length === 0 ? (
            <EmptyState icon={<TrendingUp className="h-7 w-7" />} title="No engagement data yet" description="Your screenplays will appear here once readers start engaging. Audience signals — retention, completion, recommendations — will emerge as readers participate." tone="encouraging" />
          ) : (
            <div className="space-y-2.5">
              {trendingMetrics.slice(0, 4).map((sp) => (
                <Link key={sp.id} to={`/app/screenplays/${sp.id}`} className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all duration-300 hover:border-accent/20 hover:shadow-soft">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{sp.title}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {sp.metrics!.reader_count}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {formatPercentage(sp.metrics!.completion_rate)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {formatPercentage(sp.metrics!.recommendation_rate)}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Recent Activity"
          subtitle="Latest engagement on your screenplays"
          icon={<Activity className="h-5 w-5" />}
        >
          {recentActivity.length === 0 ? (
            <EmptyState icon={<Activity className="h-7 w-7" />} title="No reader activity yet" description="Activity from reader engagement — page milestones, completions, and recommendations — will appear here as your screenplay moves through the reading pool." tone="guiding" />
          ) : (
            <div className="space-y-2.5">
              {recentActivity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Recent Notifications"
          subtitle="Stay up to date"
          icon={<Bell className="h-5 w-5" />}
          action={{ label: 'View all', to: '/app/notifications' }}
        >
          {recentNotifs.length === 0 ? (
            <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications yet" description="You will be notified here when readers complete your screenplay, leave feedback, or when industry members discover your work." tone="guiding" />
          ) : (
            <div className="space-y-2.5">
              {recentNotifs.map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
      </div>
    </div>
  );
}
