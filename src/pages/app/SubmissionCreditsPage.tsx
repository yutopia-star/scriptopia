import { useState, useEffect } from 'react';
import { Coins, TrendingUp, History, Upload, ArrowDownCircle, ArrowUpCircle, Award, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchCredits, fetchCreditTransactions, fetchPlatformSettings } from '@/lib/writer';
import { fetchContributionBalance, fetchContributionEvents, fetchActiveAlgorithm } from '@/lib/reader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { SubmissionCredits, CreditTransaction, PlatformSettings } from '@/types/database';
import type { ReaderContributionBalance, ContributionEvent, ReaderContributionAlgorithm } from '@/types/database';

export function SubmissionCreditsPage() {
  const { profile } = useAuth();
  const [credits, setCredits] = useState<SubmissionCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [contribution, setContribution] = useState<ReaderContributionBalance | null>(null);
  const [events, setEvents] = useState<ContributionEvent[]>([]);
  const [algorithm, setAlgorithm] = useState<ReaderContributionAlgorithm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const [c, t, s, cb, ce, algo] = await Promise.all([
      fetchCredits(profile.id),
      fetchCreditTransactions(profile.id),
      fetchPlatformSettings(),
      fetchContributionBalance(profile.id),
      fetchContributionEvents(profile.id),
      fetchActiveAlgorithm(),
    ]);
    setCredits(c);
    setTransactions(t);
    setSettings(s);
    setContribution(cb);
    setEvents(ce);
    setAlgorithm(algo);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  const balance = credits?.balance ?? 0;
  const availableCredits = contribution?.available_credits ?? balance;
  const totalEarned = contribution?.total_credits_earned ?? credits?.total_earned ?? 0;
  const currentPoints = contribution?.current_points ?? 0;
  const threshold = algorithm?.credit_threshold ?? 1000;
  const progressPct = threshold > 0 ? Math.min((currentPoints / threshold) * 100, 100) : 0;

  return (
    <div>
      <PageHeader
        label="Credits"
        title="Submission Credits"
        description="Your reading contribution earns screenplay upload credits."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available Credits" value={availableCredits} icon={<Upload className="h-5 w-5" />} />
        <StatCard label="Total Credits Earned" value={totalEarned} icon={<Award className="h-5 w-5" />} color="text-success" />
        <StatCard label="Contribution Points" value={currentPoints} icon={<Activity className="h-5 w-5" />} color="text-accent" />
        <StatCard label="Points to Next Credit" value={Math.max(threshold - currentPoints, 0)} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {/* Progress to next upload credit */}
      <Card className="mt-6">
        <CardHeader title="Your Reading Contribution" subtitle="Progress towards your next upload credit" icon={<TrendingUp className="h-5 w-5" />} />
        <div className="p-5 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-xs text-muted-foreground">{currentPoints} / {threshold} points</span>
            <span className="font-medium text-foreground">{Math.round(progressPct)}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden  bg-muted">
            <div className="h-full  bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          {availableCredits > 0 && (
            <p className="mt-3 text-sm font-medium text-success">
              You have {availableCredits} upload credit{availableCredits > 1 ? 's' : ''} available.
            </p>
          )}
          {availableCredits === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {Math.max(threshold - currentPoints, 0)} more points to earn your next upload credit.
            </p>
          )}
        </div>
      </Card>

      {/* Contribution history */}
      <Card className="mt-6">
        <CardHeader title="Contribution History" subtitle="Your reading evaluations and points earned" icon={<History className="h-5 w-5" />} />
        <div className="p-5 pt-4">
          {events.length === 0 ? (
            <EmptyState icon={<History className="h-7 w-7" />} title="No contributions yet" description="Complete screenplay reviews to earn contribution points." tone="encouraging" />
          ) : (
            <Table
              data={events}
              rowKey={(e) => e.id}
              columns={[
                {
                  key: 'date',
                  header: 'Date',
                  render: (e) => (
                    <span className="font-mono text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                  ),
                },
                {
                  key: 'pages',
                  header: 'Pages Read',
                  render: (e) => <span className="text-sm text-foreground">{e.pages_read}</span>,
                },
                {
                  key: 'decision',
                  header: 'Outcome',
                  render: (e) => (
                    <span className={`text-xs capitalize ${e.decision === 'finished' ? 'text-success' : 'text-warning'}`}>
                      {e.decision}
                    </span>
                  ),
                },
                {
                  key: 'quality',
                  header: 'Feedback Quality',
                  render: (e) => (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden  bg-muted">
                        <div className={`h-full  ${e.feedback_quality_score >= 60 ? 'bg-success' : e.feedback_quality_score >= 30 ? 'bg-warning' : 'bg-error'}`} style={{ width: `${e.feedback_quality_score}%` }} />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{e.feedback_quality_score}</span>
                    </div>
                  ),
                },
                {
                  key: 'points',
                  header: 'Points Earned',
                  render: (e) => (
                    <span className="text-sm font-semibold text-success">+{e.points_awarded}</span>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Card>

      {/* Credit transaction history */}
      <Card className="mt-6">
        <CardHeader title="Credit History" subtitle="All credit transactions" icon={<Coins className="h-5 w-5" />} />
        <div className="p-5 pt-4">
          {transactions.length === 0 ? (
            <EmptyState icon={<Coins className="h-7 w-7" />} title="No transactions yet" description="Your credit earning and spending history will appear here." tone="guiding" />
          ) : (
            <Table
              data={transactions}
              rowKey={(t) => t.id}
              columns={[
                {
                  key: 'description',
                  header: 'Description',
                  render: (t) => (
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center  ${t.amount > 0 ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                        {t.amount > 0 ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.reason || t.type}</p>
                        <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (t) => (
                    <span className={`text-sm font-semibold ${t.amount > 0 ? 'text-success' : 'text-error'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
