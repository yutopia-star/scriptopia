import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, FileText, Globe, Coins, Play, Loader2, RefreshCw, TrendingUp, CheckCircle, Target, Flame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getOrCreateAssignment, fetchActiveAssignment, fetchAssignmentScreenplay,
  fetchMilestones, fetchReaderBehaviour,
} from '@/lib/reader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { ReaderAssignment, RetentionMilestone, ReaderBehaviour } from '@/types/database';

interface ScreenplayInfo {
  title: string;
  logline: string | null;
  genre: string;
  format: string;
  page_count: number | null;
  language: string;
  estimated_budget: string | null;
}

export function AssignedScreenplayPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<ReaderAssignment | null>(null);
  const [screenplay, setScreenplay] = useState<ScreenplayInfo | null>(null);
  const [milestones, setMilestones] = useState<RetentionMilestone[]>([]);
  const [behaviour, setBehaviour] = useState<ReaderBehaviour | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [noScreenplays, setNoScreenplays] = useState(false);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const a = await fetchActiveAssignment(profile.id);
    if (a) {
      setAssignment(a);
      const sp = await fetchAssignmentScreenplay(a);
      setScreenplay(sp as ScreenplayInfo | null);
      setMilestones(await fetchMilestones(a.id));
    }
    setBehaviour(await fetchReaderBehaviour(profile.id));
    setLoading(false);
  }

  async function handleGetAssignment() {
    if (!profile) return;
    setAssigning(true);
    try {
      const result = await getOrCreateAssignment(profile.id);
      if (result?.assignment_id) {
        await load();
      } else {
        setNoScreenplays(true);
      }
    } catch {
      setNoScreenplays(true);
    }
    setAssigning(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  if (!assignment) {
    return (
      <div>
        <PageHeader label="Reader" title="Assigned Screenplay" description="Your next screenplay to review." />
        <div className="mt-8">
          {noScreenplays ? (
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="No screenplays available"
              description="We're finding your next screenplay. Please check back soon — new screenplays are submitted regularly."
              action={<Button onClick={handleGetAssignment} disabled={assigning}><RefreshCw className="h-4 w-4" /> Try Again</Button>}
              tone="encouraging"
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="No screenplay has been assigned yet"
              description="We're finding your next screenplay. Click below to get your assignment."
              action={<Button onClick={handleGetAssignment} disabled={assigning}>
                {assigning ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding...</> : <><BookOpen className="h-4 w-4" /> Get Assignment</>}
              </Button>}
              tone="encouraging"
            />
          )}
        </div>
      </div>
    );
  }

  const progress = assignment.reading_progress;

  return (
    <div className="space-y-6">
      <PageHeader label="Reader" title="Assigned Screenplay" description="Your current assignment for review." />

      {/* Assignment card */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64  bg-accent/8 blur-3xl" />
        <div className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center  bg-secondary text-secondary-foreground">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">{screenplay?.title || 'Untitled Screenplay'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{screenplay?.logline || 'No logline available'}</p>
              </div>
            </div>
            <StatusBadge status="Active" variant="info" />
          </div>

          {/* Metadata grid */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem icon={<FileText className="h-4 w-4" />} label="Genre" value={screenplay?.genre || '—'} />
            <MetaItem icon={<BookOpen className="h-4 w-4" />} label="Format" value={FORMAT_LABELS[screenplay?.format as keyof typeof FORMAT_LABELS] || screenplay?.format || '—'} />
            <MetaItem icon={<FileText className="h-4 w-4" />} label="Page Count" value={screenplay?.page_count ? `${screenplay.page_count} pages` : '—'} />
            <MetaItem icon={<Globe className="h-4 w-4" />} label="Language" value={screenplay?.language || '—'} />
            <MetaItem icon={<Coins className="h-4 w-4" />} label="Estimated Budget" value={screenplay?.estimated_budget || '—'} />
            <MetaItem icon={<Clock className="h-4 w-4" />} label="Assigned" value={new Date(assignment.assigned_at).toLocaleDateString()} />
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />}>Reading Progress</SectionLabel>
              <span className="font-mono text-xs text-foreground">{progress}% · Page {assignment.current_page}{screenplay?.page_count ? ` of ${screenplay.page_count}` : ''}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden  bg-muted">
              <div className="h-full  bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Start Reading button */}
          <div className="mt-6">
            <Button onClick={() => navigate(`/app/read/${assignment.id}`)} size="lg">
              <Play className="h-4 w-4" /> {progress > 0 ? 'Resume Reading' : 'Start Reading'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Retention milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader title="Reading Milestones" subtitle="Pages you have reached" icon={<Clock className="h-5 w-5" />} />
          <div className="mt-4 flex flex-wrap gap-2 p-5 pt-0">
            {milestones.map((m) => (
              <StatusBadge key={m.id} status={m.milestone_name} variant="success" />
            ))}
          </div>
        </Card>
      )}

      {/* Reader stats */}
      {behaviour && (
        <div>
          <SectionLabel className="mb-3">Reader Statistics</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Assignments" value={behaviour.total_assignments} icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Completed" value={behaviour.total_completed} icon={<CheckCircle className="h-5 w-5" />} />
            <StatCard label="Completion Rate" value={`${behaviour.completion_rate}%`} icon={<Target className="h-5 w-5" />} />
            <StatCard label="Reading Streak" value={`${behaviour.current_streak_days}d`} icon={<Flame className="h-5 w-5" />} />
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-secondary-foreground">
        {icon}
      </div>
      <div>
        <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
