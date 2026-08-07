import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Coins, Star, Flame, Bell, Activity, Play, Award, ArrowRight, TrendingUp, Sparkles, Clock, CheckCircle, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import {
  fetchActiveAssignment, fetchAssignmentScreenplay, fetchReaderBehaviour,
  fetchReviewHistory, fetchContributionBalance, fetchActiveAlgorithm,
} from '@/lib/reader';
import { StatCard } from '@/components/ui/StatCard';
import { DashboardWidget } from '@/components/app/DashboardWidget';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { AnimatedStat } from '@/components/ui/AnimatedStat';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import type { ReaderAssignment, ReaderBehaviour, ReaderContributionBalance, ReaderContributionAlgorithm } from '@/types/database';
import type { ReviewHistoryItem } from '@/lib/reader';

interface ScreenplayInfo {
  title: string;
  logline: string | null;
  genre: string;
  format: string;
  page_count: number | null;
}

export function ReaderDashboard() {
  const { profile } = useAuth();
  const { notifications } = useNotifications();
  const [assignment, setAssignment] = useState<ReaderAssignment | null>(null);
  const [screenplay, setScreenplay] = useState<ScreenplayInfo | null>(null);
  const [behaviour, setBehaviour] = useState<ReaderBehaviour | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [credits, setCredits] = useState(0);
  const [contribution, setContribution] = useState<ReaderContributionBalance | null>(null);
  const [algorithm, setAlgorithm] = useState<ReaderContributionAlgorithm | null>(null);
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const a = await fetchActiveAssignment(profile.id);
    setAssignment(a);
    if (a) {
      const sp = await fetchAssignmentScreenplay(a);
      setScreenplay(sp as ScreenplayInfo | null);
    }
    const beh = await fetchReaderBehaviour(profile.id);
    setBehaviour(beh);
    const { data: rp } = await supabase
      .from('reader_profiles').select('reviews_count').eq('user_id', profile.id).maybeSingle();
    setReviewCount(rp?.reviews_count ?? 0);
    const { data: sc } = await supabase
      .from('submission_credits').select('balance').eq('user_id', profile.id).maybeSingle();
    setCredits(sc?.balance ?? 0);
    const cb = await fetchContributionBalance(profile.id);
    setContribution(cb);
    const algo = await fetchActiveAlgorithm();
    setAlgorithm(algo);
    setHistory(await fetchReviewHistory(profile.id));
    setLoading(false);
  }

  const recentNotifs = notifications.slice(0, 4);
  const currentPoints = contribution?.current_points ?? 0;
  const threshold = algorithm?.credit_threshold ?? 1000;
  const progressPct = threshold > 0 ? Math.min((currentPoints / threshold) * 100, 100) : 0;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome panel */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72  bg-tertiary/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64  bg-accent/5 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 border border-border bg-background/60 px-3 py-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3 w-3 text-tertiary" /> Reader Discovery
            </div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Welcome back, {profile?.username}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Discover and evaluate stories — your reading contributes to screenplay discovery.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/app/assigned"><Button size="sm"><Play className="h-4 w-4" /> {assignment ? 'Resume Reading' : 'Get Assignment'}</Button></Link>
              <Link to="/app/discover"><Button variant="outline" size="sm"><Sparkles className="h-4 w-4" /> Discover</Button></Link>
            </div>
          </div>
          {assignment && screenplay && (
            <div className="hidden sm:block">
              <div className="border border-border bg-background/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current Reading</p>
                <p className="mt-1.5 font-display text-lg font-semibold text-foreground line-clamp-1">{screenplay.title}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden bg-muted">
                    <div className="h-full bg-gradient-to-r from-tertiary to-accent transition-all duration-500" style={{ width: `${assignment.reading_progress}%` }} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{assignment.reading_progress}%</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Page {assignment.current_page}{screenplay.page_count ? ` of ${screenplay.page_count}` : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animated stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AnimatedStat label="Active Assignment" value={assignment ? 1 : 0} icon={<BookOpen className="h-5 w-5" />} />
        <AnimatedStat label="Reviews Completed" value={reviewCount} icon={<ClipboardList className="h-5 w-5" />} color="text-tertiary" />
        <AnimatedStat label="Upload Credits" value={contribution?.available_credits ?? credits} icon={<Coins className="h-5 w-5" />} color="text-accent" />
        <AnimatedStat label="Reputation" value={behaviour?.completion_rate ?? 0} suffix="%" icon={<Star className="h-5 w-5" />} color="text-accent" />
        <AnimatedStat label="Reading Streak" value={behaviour?.current_streak_days ?? 0} suffix="d" icon={<Flame className="h-5 w-5" />} color="text-warning" />
      </div>

      {/* Current Assignment — Reading Queue */}
      {assignment && screenplay ? (
        <Card>
          <CardHeader title="Reading Queue" subtitle="Your current assignment" icon={<BookOpen className="h-5 w-5" />} action={<Link to="/app/assigned"><Button size="sm" variant="ghost">View All <ArrowRight className="h-4 w-4" /></Button></Link>} />
          <div className="p-5 pt-2">
            <div className="group relative overflow-hidden rounded-xl border border-border bg-background p-6 transition-all hover:border-accent/20">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 bg-tertiary/5 blur-2xl" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center bg-tertiary/10 text-tertiary">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{screenplay.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{screenplay.logline || 'No logline'}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{screenplay.genre}</span>
                      <span>· {screenplay.format}</span>
                      {screenplay.page_count && <span>· {screenplay.page_count} pages</span>}
                    </div>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-32 overflow-hidden bg-muted">
                      <div className="h-full bg-gradient-to-r from-tertiary to-accent transition-all duration-500" style={{ width: `${assignment.reading_progress}%` }} />
                    </div>
                    <span className="font-display text-sm font-semibold text-foreground">{assignment.reading_progress}%</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Page {assignment.current_page}{screenplay.page_count ? ` of ${screenplay.page_count}` : ''}</p>
                  <Link to="/app/assigned" className="mt-3 inline-block">
                    <Button size="sm"><Play className="h-4 w-4" /> {assignment.reading_progress > 0 ? 'Resume' : 'Start Reading'}</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Reading Queue" subtitle="Screenplays waiting for your review" icon={<BookOpen className="h-5 w-5" />} />
          <div className="p-5 pt-2">
            <EmptyState icon={<BookOpen className="h-7 w-7" />} title="No active assignment" description="New screenplays will appear here when one is assigned to you. Your reading helps writers understand how audiences engage with their work." tone="guiding" action={<Link to="/app/assigned"><Button size="sm"><BookOpen className="h-4 w-4" /> Get Assignment</Button></Link>} />
          </div>
        </Card>
      )}

      {/* Contribution progress — Reading Rewards */}
      {contribution && algorithm && (
        <Card>
          <CardHeader title="Reading Rewards" subtitle="Progress towards your next upload credit" icon={<Trophy className="h-5 w-5" />} action={<Link to="/app/credits"><Button size="sm" variant="ghost">View Details <ArrowRight className="h-4 w-4" /></Button></Link>} />
          <div className="p-5 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentPoints} / {threshold} points</span>
              <span className="font-display text-lg font-semibold text-foreground">{Math.round(progressPct)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden bg-muted">
              <div className="h-full bg-gradient-to-r from-tertiary to-accent transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="mt-4 flex items-center gap-2 bg-muted/50 px-4 py-3">
              <Trophy className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">
                {progressPct >= 100 ? 'You have earned a new upload credit!' : `${threshold - currentPoints} more points to earn your next credit.`}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardWidget
          title="Reading History"
          subtitle="Your recently completed reviews"
          icon={<Clock className="h-5 w-5" />}
          action={{ label: 'View history', to: '/app/reviews' }}
        >
          {history.length === 0 ? (
            <EmptyState icon={<Clock className="h-7 w-7" />} title="No reading history yet" description="Your completed reviews will appear here. Each completed review contributes to screenplay discovery and earns you credits." tone="guiding" />
          ) : (
            <div className="space-y-2.5">
              {history.slice(0, 4).map((item) => (
                <div key={item.assignment.id} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition-all hover:border-accent/20">
                  <div className="flex h-10 w-10 items-center justify-center bg-tertiary/10 text-tertiary">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm font-semibold text-foreground">{item.screenplay?.title || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.assignment.assigned_at).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>

        <DashboardWidget
          title="Recent Achievements"
          subtitle="Your latest earned badges"
          icon={<Award className="h-5 w-5" />}
          action={{ label: 'View all', to: '/app/achievements' }}
        >
          <EmptyState icon={<Award className="h-7 w-7" />} title="No achievements yet" description="Complete reviews to earn achievements and build your reputation as a reader. Your contributions help writers discover how audiences respond to their stories." tone="encouraging" />
        </DashboardWidget>

        <DashboardWidget
          title="Recent Activity"
          subtitle="Your latest reviews and interactions"
          icon={<Activity className="h-5 w-5" />}
          action={{ label: 'View history', to: '/app/reviews' }}
        >
          {history.length === 0 ? (
            <EmptyState icon={<Activity className="h-7 w-7" />} title="No recent activity" description="Your review history and reading activity will appear here. Each completed review contributes to screenplay discovery and earns you credits." tone="guiding" />
          ) : (
            <div className="space-y-2.5">
              {history.slice(0, 4).map((item) => (
                <div key={item.assignment.id} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3.5">
                  <div className="flex h-9 w-9 items-center justify-center bg-secondary text-secondary-foreground">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.screenplay?.title || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.assignment.assigned_at).toLocaleDateString()}</p>
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
            <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="You will be notified about new assignments, achievements, and credit milestones here." tone="guiding" />
          ) : (
            <div className="space-y-2.5">
              {recentNotifs.map((n) => (
                <div key={n.id} className="flex items-start gap-3  rounded-xl border border-border bg-background p-3.5">
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
    </div>
  );
}
