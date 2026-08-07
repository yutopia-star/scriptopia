import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Upload, FileEdit, Eye, Users, CheckCircle, Mail, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchActivity } from '@/lib/writer';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { ScreenplayActivity } from '@/types/database';

const EVENT_ICONS: Record<string, typeof Activity> = {
  screenplay_uploaded: Upload,
  revision_uploaded: FileEdit,
  reader_assigned: Users,
  review_completed: CheckCircle,
  producer_viewed: Eye,
  contact_request_received: Mail,
  status_changed: RefreshCw,
  screenplay_archived: Activity,
  screenplay_restored: Activity,
  screenplay_deleted: Activity,
};

export function WriterActivityPage() {
  const { profile } = useAuth();
  const [activity, setActivity] = useState<ScreenplayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setActivity(await fetchActivity(profile.id, 50));
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader label="Writer" title="Activity Timeline" description="All your screenplay activity in one place." />

      <div className="mt-6">
        {activity.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-7 w-7" />}
            title="No activity yet"
            description="Your screenplay activity will appear here as you upload, revise, and receive reviews."
            action={<Link to="/app/screenplays/upload"><Button><Upload className="h-4 w-4" /> Upload a Screenplay</Button></Link>}
            tone="encouraging"
          />
        ) : (
          <Card>
            <CardHeader title="Recent Activity" subtitle={`${activity.length} ${activity.length === 1 ? 'event' : 'events'}`} icon={<Activity className="h-5 w-5" />} />
            <div className="mt-2 p-5 pt-0">
              <div className="relative space-y-0">
                {activity.map((a, i) => {
                  const Icon = EVENT_ICONS[a.event_type] || Activity;
                  const isLast = i === activity.length - 1;
                  return (
                    <div key={a.id} className="relative flex gap-4 py-3">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-[18px] top-12 bottom-0 w-px bg-border" />
                      )}
                      {/* Icon */}
                      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center  bg-secondary text-secondary-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-3">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        {a.description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.description}</p>}
                        <p className="mt-1.5 flex items-center gap-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(a.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
