import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Bookmark, HeartHandshake, Bell, TrendingUp, FileText, Award, Building2, Users, CheckCircle, Eye, Sparkles, ArrowRight, Flame, BarChart3, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { DashboardWidget } from '@/components/app/DashboardWidget';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { ConfidenceGauge } from '@/components/ui/ConfidenceGauge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { fetchWatchlists, fetchIntroRequestsSent, fetchAllMatches } from '@/lib/industry';
import { formatPercentage, confidenceVariant } from '@/lib/engagement';
import type { Screenplay, ScreenplayDiscoveryMetrics } from '@/types/database';

interface TrendingScreenplay {
  screenplay: Screenplay;
  metrics: ScreenplayDiscoveryMetrics;
}

export function IndustryDashboard() {
  const { profile } = useAuth();
  const { notifications } = useNotifications();
  const [stats, setStats] = useState({ saved: 0, watchlists: 0, discoveries: 0, introductions: 0 });
  const [industryProfile, setIndustryProfile] = useState<{ company_verified: boolean; account_type: string; company_name: string | null } | null>(null);
  const [trending, setTrending] = useState<TrendingScreenplay[]>([]);
  const [matches, setMatches] = useState<Array<{ screenplay_id: string; match_percentage: number; screenplay: Screenplay }>>([]);
  const [recentValidations, setRecentValidations] = useState<TrendingScreenplay[]>([]);
  const [introCount, setIntroCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);

      const { data: indProfile } = await supabase
        .from('industry_profiles').select('*').eq('user_id', profile.id).maybeSingle();
      setIndustryProfile(indProfile as typeof industryProfile);

      const wl = await fetchWatchlists(profile.id);
      let savedCount = 0;
      for (const w of wl) {
        const { count } = await supabase.from('watchlist_items').select('id', { count: 'exact', head: true }).eq('watchlist_id', w.id);
        savedCount += count ?? 0;
      }

      const intros = await fetchIntroRequestsSent(profile.id);
      setIntroCount(intros.length);

      const { data: trendingData } = await supabase
        .from('screenplay_discovery_metrics')
        .select('*, screenplay:screenplays!inner(*)')
        .eq('is_discoverable', true)
        .order('trending_score', { ascending: false })
        .limit(4);
      setTrending((trendingData ?? []) as unknown as TrendingScreenplay[]);

      const { data: recentData } = await supabase
        .from('screenplay_discovery_metrics')
        .select('*, screenplay:screenplays!inner(*)')
        .eq('is_discoverable', true)
        .order('last_review_at', { ascending: false })
        .limit(4);
      setRecentValidations((recentData ?? []) as unknown as TrendingScreenplay[]);

      const allMatches = await fetchAllMatches(profile.id);
      setMatches(allMatches.slice(0, 4));

      setStats({
        saved: savedCount,
        watchlists: wl.length,
        discoveries: trendingData?.length ?? 0,
        introductions: intros.length,
      });
      setLoading(false);
    }
    load();
  }, [profile]);

  const recentNotifs = notifications.slice(0, 4);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome panel */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72  bg-accent/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64  bg-tertiary/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 border border-border bg-background/60 px-3 py-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3 w-3 text-accent" /> Industry Discovery
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Welcome back, {profile?.username}</h1>
              {industryProfile?.company_verified && (
                <StatusBadge status="Verified" variant="success" />
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Find screenplays backed by audience evidence — not just opinions.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/app/discover"><Button size="sm"><Compass className="h-4 w-4" /> Discover Screenplays</Button></Link>
              <Link to="/app/watchlists"><Button variant="outline" size="sm"><Bookmark className="h-4 w-4" /> My Watchlists</Button></Link>
            </div>
          </div>
        </div>
      </div>

      {/* Animated stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedStat label="Saved Screenplays" value={stats.saved} icon={<Bookmark className="h-5 w-5" />} />
        <AnimatedStat label="Watchlists" value={stats.watchlists} icon={<FileText className="h-5 w-5" />} />
        <AnimatedStat label="Discoverable" value={stats.discoveries} icon={<Compass className="h-5 w-5" />} color="text-accent" />
        <AnimatedStat label="Introduction Requests" value={stats.introductions} icon={<HeartHandshake className="h-5 w-5" />} color="text-tertiary" />
      </div>

      {/* Trending Screenplays — Engagement Ranking */}
      <Card>
        <CardHeader
          title="Trending Screenplays"
          subtitle="Ranked by audience engagement strength"
          icon={<TrendingUp className="h-5 w-5" />}
          action={<Link to="/app/discover"><Button size="sm" variant="ghost">Discover More <ArrowRight className="h-4 w-4" /></Button></Link>}
        />
        <div className="p-5 pt-2">
          {trending.length === 0 ? (
            <EmptyState icon={<TrendingUp className="h-7 w-7" />} title="No trending screenplays yet" description="Validated screenplays with strong recent reader engagement will appear here. These scripts show real audience response — not just subjective opinions." tone="encouraging" action={<Link to="/app/discover"><Button size="sm"><Compass className="h-4 w-4" /> Discover</Button></Link>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trending.map(({ screenplay, metrics }, idx) => (
                <Link key={screenplay.id} to={`/app/discover/${screenplay.id}`}>
                  <div className="group relative h-full overflow-hidden rounded-xl border border-border bg-background p-5 transition-all duration-300 hover:border-accent/30 hover:shadow-elevated">
                    {/* Rank badge */}
                    <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center bg-accent/10 font-display text-sm font-semibold text-accent">
                      {idx + 1}
                    </div>
                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-accent/5 blur-2xl transition-opacity group-hover:bg-accent/10" />
                    <p className="relative font-display text-base font-semibold text-foreground line-clamp-1 pr-8">{screenplay.title}</p>
                    <p className="relative mt-1.5 text-xs text-muted-foreground line-clamp-2">{screenplay.logline}</p>
                    <div className="relative mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {metrics.reader_count}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {formatPercentage(metrics.completion_rate)}</span>
                      <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {metrics.trending_score?.toFixed(0) ?? '—'}</span>
                    </div>
                    <div className="relative mt-3">
                      <StatusBadge status={metrics.confidence_level} variant={confidenceVariant(metrics.confidence_level)} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Confidence Overview — featured screenplay */}
      {trending.length > 0 && trending[0].metrics && (
        <Card>
          <CardHeader title="Top Discovery — Audience Confidence" subtitle={trending[0].screenplay.title} icon={<Target className="h-5 w-5" />} />
          <div className="flex flex-col items-center gap-6 p-5 pt-2 sm:flex-row sm:items-center sm:justify-around">
            <ConfidenceGauge level={trending[0].metrics.confidence_level} score={trending[0].metrics.confidence_level === 'high' ? 85 : trending[0].metrics.confidence_level === 'medium' ? 55 : 25} size={140} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <BarChart3 className="mx-auto h-5 w-5 text-tertiary" />
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">{formatPercentage(trending[0].metrics.completion_rate)}</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <Users className="mx-auto h-5 w-5 text-accent" />
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">{trending[0].metrics.reader_count}</p>
                <p className="text-xs text-muted-foreground">Readers</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <TrendingUp className="mx-auto h-5 w-5 text-success" />
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">{trending[0].metrics.trending_score?.toFixed(0) ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Trending</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardWidget
          title="Recommended Matches"
          subtitle="Screenplays matching your preferences"
          icon={<Sparkles className="h-5 w-5" />}
          action={{ label: 'Set preferences', to: '/app/settings' }}
        >
          {matches.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-7 w-7" />} title="No matches yet" description="Set your discovery preferences — genres, formats, budget ranges — to receive personalised screenplay recommendations backed by audience data." tone="guiding" action={<Link to="/app/settings"><Button size="sm">Set Preferences</Button></Link>} />
          ) : (
            <div className="space-y-2.5">
              {matches.map((m) => (
                <Link key={m.screenplay_id} to={`/app/discover/${m.screenplay_id}`} className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-accent/20">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{m.screenplay.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.screenplay.genre} · {m.screenplay.country}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-16 overflow-hidden bg-muted">
                        <div className="h-full bg-gradient-to-r from-tertiary to-accent transition-all duration-500" style={{ width: `${m.match_percentage}%` }} />
                      </div>
                      <span className="font-display text-sm font-bold text-accent">{m.match_percentage}%</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Recent Validations"
          subtitle="Newly validated screenplays"
          icon={<Award className="h-5 w-5" />}
          action={{ label: 'View all', to: '/app/discover' }}
        >
          {recentValidations.length === 0 ? (
            <EmptyState icon={<Award className="h-7 w-7" />} title="No recent validations" description="Screenplays that meet discovery requirements — minimum readers, completed reviews, and confidence thresholds — will appear here as they become validated." tone="guiding" />
          ) : (
            <div className="space-y-2.5">
              {recentValidations.slice(0, 4).map(({ screenplay, metrics }) => (
                <Link key={screenplay.id} to={`/app/discover/${screenplay.id}`} className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-accent/20">
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">{screenplay.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{screenplay.genre}</span>
                      <span>· {metrics.reader_count} readers</span>
                      {metrics.last_review_at && <span>· {new Date(metrics.last_review_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Watchlists"
          subtitle="Organise screenplays into curated lists"
          icon={<Bookmark className="h-5 w-5" />}
          action={{ label: 'View all', to: '/app/watchlists' }}
        >
          {stats.watchlists === 0 ? (
            <EmptyState icon={<Bookmark className="h-7 w-7" />} title="No watchlists yet" description="Create watchlists to organise and track screenplays that interest you. Group by genre, budget range, or any criteria that matters to your search." tone="guiding" action={<Link to="/app/watchlists"><Button size="sm"><Bookmark className="h-4 w-4" /> Create</Button></Link>} />
          ) : (
            <div className="space-y-2.5">
              <Link to="/app/watchlists" className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-accent/20">
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{stats.watchlists} watchlist{stats.watchlists > 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">{stats.saved} saved screenplay{stats.saved !== 1 ? 's' : ''}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Introduction Requests"
          subtitle="Connect with writers"
          icon={<HeartHandshake className="h-5 w-5" />}
          action={{ label: 'View all', to: '/app/introductions' }}
        >
          {introCount === 0 ? (
            <EmptyState icon={<HeartHandshake className="h-7 w-7" />} title="No introduction requests" description="Request introductions to writers whose screenplays show strong audience engagement. Writer contact details are shared only after they accept your request." tone="guiding" action={<Link to="/app/discover"><Button size="sm"><Compass className="h-4 w-4" /> Discover</Button></Link>} />
          ) : (
            <div className="space-y-2.5">
              <Link to="/app/introductions" className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-accent/20">
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">{introCount} request{introCount > 1 ? 's' : ''} sent</p>
                  <p className="text-xs text-muted-foreground">View and track your introduction requests</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            </div>
          )}
        </DashboardWidget>
      </div>

      {/* Notifications */}
      <DashboardWidget
        title="Recent Notifications"
        subtitle="Stay up to date"
        icon={<Bell className="h-5 w-5" />}
        action={{ label: 'View all', to: '/app/notifications' }}
      >
        {recentNotifs.length === 0 ? (
          <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="You will be notified here about new validated screenplays, watchlist updates, and introduction request responses." tone="guiding" />
        ) : (
          <div className="space-y-2.5">
            {recentNotifs.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent/10 text-accent">
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
  );
}
