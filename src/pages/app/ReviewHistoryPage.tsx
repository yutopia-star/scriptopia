import { useState, useEffect } from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle, Star, Coins, Eye, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchReviewHistory, formatReadingTimeShort } from '@/lib/reader';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { ReviewHistoryItem } from '@/lib/reader';

export function ReviewHistoryPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<ReviewHistoryItem | null>(null);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setHistory(await fetchReviewHistory(profile.id));
    setLoading(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader label="Reader" title="Review History" description="Your completed and abandoned screenplay reviews." />

      {history.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            title="You haven't completed any reviews yet"
            description="Your review history will appear here once you complete your first screenplay review."
            tone="encouraging"
          />
        </div>
      ) : (
        <div className="mt-6">
          <Table
            data={history}
            rowKey={(item) => item.assignment.id}
            onRowClick={(item) => setViewItem(item)}
            columns={[
              {
                key: 'title',
                header: 'Screenplay',
                render: (item) => (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-secondary-foreground">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.screenplay?.title || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{item.screenplay ? FORMAT_LABELS[item.screenplay.format as keyof typeof FORMAT_LABELS] || item.screenplay.format : '—'}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'decision',
                header: 'Outcome',
                render: (item) => {
                  if (item.decision?.decision === 'finished') return <StatusBadge status="Completed" variant="success" />;
                  if (item.decision?.decision === 'stopped') return <StatusBadge status="Abandoned" variant="error" />;
                  return <StatusBadge status="Return Later" variant="neutral" />;
                },
              },
              {
                key: 'recommendation',
                header: 'Recommendation',
                render: (item) => {
                  if (item.decision?.recommendation === true) return <span className="flex items-center gap-1 text-sm text-success"><Star className="h-3.5 w-3.5" /> Yes</span>;
                  if (item.decision?.recommendation === false) return <span className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-3.5 w-3.5" /> No</span>;
                  return <span className="text-xs text-muted-foreground">—</span>;
                },
              },
              {
                key: 'duration',
                header: 'Reading Time',
                render: (item) => (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {item.decision?.reading_time_ms ? formatReadingTimeShort(item.decision.reading_time_ms) : '—'}
                  </span>
                ),
              },
              {
                key: 'date',
                header: 'Date',
                render: (item) => (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(item.assignment.assigned_at).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Review detail modal */}
      {viewItem && (
        <Modal open={true} onClose={() => setViewItem(null)} title="Review Details" maxWidth="max-w-lg">
          <div className="space-y-4">
            <div>
              <SectionLabel>Screenplay</SectionLabel>
              <p className="mt-1 font-display text-base font-semibold text-foreground">{viewItem.screenplay?.title || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{viewItem.screenplay?.genre} · {viewItem.screenplay ? FORMAT_LABELS[viewItem.screenplay.format as keyof typeof FORMAT_LABELS] : ''}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>Outcome</SectionLabel>
                <div className="mt-1">
                  {viewItem.decision?.decision === 'finished' ? <StatusBadge status="Completed" variant="success" /> : <StatusBadge status="Abandoned" variant="error" />}
                </div>
              </div>
              {viewItem.decision?.recommendation !== null && viewItem.decision?.recommendation !== undefined && (
                <div>
                  <SectionLabel>Recommendation</SectionLabel>
                  <p className={`mt-1 text-sm font-medium ${viewItem.decision.recommendation ? 'text-success' : 'text-muted-foreground'}`}>
                    {viewItem.decision.recommendation ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
              <div>
                <SectionLabel>Reading Time</SectionLabel>
                <p className="mt-1 text-sm font-medium text-foreground">{viewItem.decision?.reading_time_ms ? formatReadingTimeShort(viewItem.decision.reading_time_ms) : '—'}</p>
              </div>
              <div>
                <SectionLabel>Sessions</SectionLabel>
                <p className="mt-1 text-sm font-medium text-foreground">{viewItem.decision?.session_count ?? '—'}</p>
              </div>
              {viewItem.decision?.page_abandoned && (
                <div>
                  <SectionLabel>Page Abandoned</SectionLabel>
                  <p className="mt-1 text-sm font-medium text-foreground">{viewItem.decision.page_abandoned}</p>
                </div>
              )}
            </div>

            {viewItem.decision?.written_feedback && (
              <div>
                <SectionLabel className="mb-1.5">Written Feedback</SectionLabel>
                <p className=" rounded-xl border border-border bg-background p-3 text-sm text-foreground">{viewItem.decision.written_feedback}</p>
              </div>
            )}

            {viewItem.decision?.private_notes && (
              <div>
                <SectionLabel className="mb-1.5">Private Notes</SectionLabel>
                <p className=" rounded-xl border border-border bg-background p-3 text-sm text-foreground">{viewItem.decision.private_notes}</p>
              </div>
            )}

            {viewItem.decision?.stop_reason && (
              <div>
                <SectionLabel>Reason for Stopping</SectionLabel>
                <p className="mt-1 text-sm font-medium text-foreground capitalize">{viewItem.decision.stop_reason.replace(/_/g, ' ')}</p>
              </div>
            )}

            <div className=" bg-secondary px-4 py-3 text-xs text-muted-foreground">
              Reviews cannot be edited after submission.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
