import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Check, X, Clock, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchIntroRequestsSent, fetchIntroRequestsReceived, respondToIntroRequest, cancelIntroRequest } from '@/lib/industry';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { IntroductionRequest, Screenplay } from '@/types/database';

type IntroWithScreenplay = IntroductionRequest & { screenplay: Screenplay | null };

export function IntroductionRequestsPage() {
  const { profile, activeRole } = useAuth();
  const [sentRequests, setSentRequests] = useState<IntroWithScreenplay[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<IntroWithScreenplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sent' | 'received'>('sent');

  useEffect(() => {
    if (profile) {
      setTab(activeRole === 'writer' ? 'received' : 'sent');
      load();
    }
  }, [profile, activeRole]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const [sent, received] = await Promise.all([
      fetchIntroRequestsSent(profile.id),
      fetchIntroRequestsReceived(profile.id),
    ]);
    setSentRequests(sent as IntroWithScreenplay[]);
    setReceivedRequests(received as IntroWithScreenplay[]);
    setLoading(false);
  }

  async function handleRespond(requestId: string, status: 'accepted' | 'declined') {
    await respondToIntroRequest(requestId, status);
    await load();
  }

  async function handleCancel(requestId: string) {
    await cancelIntroRequest(requestId);
    await load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  const requests = tab === 'sent' ? sentRequests : receivedRequests;

  return (
    <div>
      <PageHeader
        label="Connections"
        title="Introduction Requests"
        description="Connect with writers and industry professionals through the platform."
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'sent', label: 'Sent Requests', count: sentRequests.length },
          { key: 'received', label: 'Received Requests', count: receivedRequests.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
            {count > 0 && <span className="inline-flex items-center justify-center  bg-secondary px-1.5 py-0.5 font-mono text-2xs text-secondary-foreground">{count}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {requests.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake className="h-7 w-7" />}
            title={tab === 'sent' ? 'No requests sent' : 'No requests received'}
            description={tab === 'sent' ? 'Browse Discover and request introductions to writers whose screenplays interest you.' : 'Introduction requests from industry professionals will appear here.'}
            tone="encouraging"
            action={tab === 'sent' ? <Link to="/app/discover"><Button size="sm"><HeartHandshake className="h-4 w-4" /> Discover Screenplays</Button></Link> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <div className="flex items-start gap-4 p-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center  ${req.status === 'pending' ? 'bg-warning/15 text-warning' : req.status === 'accepted' ? 'bg-success/15 text-success' : req.status === 'declined' ? 'bg-error/15 text-error' : 'bg-secondary text-secondary-foreground'}`}>
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-foreground">
                        {req.screenplay?.title || 'Screenplay removed'}
                      </span>
                      <StatusBadge
                        status={req.status}
                        variant={req.status === 'pending' ? 'warning' : req.status === 'accepted' ? 'success' : req.status === 'declined' ? 'error' : 'neutral'}
                      />
                    </div>
                    {req.screenplay && (
                      <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                        {FORMAT_LABELS[req.screenplay.format]} · {req.screenplay.genre} · {req.screenplay.country}
                      </p>
                    )}
                    {req.message && (
                      <p className="mt-2 text-sm italic text-muted-foreground">"{req.message}"</p>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {tab === 'sent' ? 'To writer' : 'From industry professional'} · {new Date(req.created_at).toLocaleDateString()}
                      {req.responded_at && ` · Responded ${new Date(req.responded_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {/* Actions */}
                  {tab === 'received' && req.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={() => handleRespond(req.id, 'accepted')}><Check className="h-4 w-4" /> Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleRespond(req.id, 'declined')}><X className="h-4 w-4" /> Decline</Button>
                    </div>
                  )}
                  {tab === 'sent' && req.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => handleCancel(req.id)}>Cancel</Button>
                  )}
                  {req.status === 'accepted' && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                      <Check className="h-3.5 w-3.5" /> Contact details shared
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
