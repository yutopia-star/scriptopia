import { useState, useEffect } from 'react';
import { Shield, Check, X, Archive, Ban, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchModerationReports, resolveReport, logAction, type ModerationReport } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';

export function AdminModeration() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    const r = await fetchModerationReports(statusFilter || undefined);
    setReports(r);
    setLoading(false);
  }

  async function handleResolve(status: string) {
    if (!selectedReport || !profile) return;
    await resolveReport(selectedReport.id, status, resolutionNotes, profile.id);
    await logAction(profile.id, `Resolved report ${selectedReport.id} as ${status}`, 'moderation', { reportId: selectedReport.id, status, notes: resolutionNotes });
    setSelectedReport(null);
    setResolutionNotes('');
    await load();
  }

  return (
    <div>
      <PageHeader
        label="Admin"
        title="Moderation"
        description="Report-based moderation. No approval queues — content publishes immediately."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {['pending', 'reviewing', 'resolved', 'dismissed', 'archived'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={` px-3.5 py-1.5 text-sm font-medium capitalize transition-all duration-200 ${statusFilter === s ? 'bg-primary text-primary-foreground ' : 'border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 " />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          title={`No ${statusFilter} reports`}
          description="When users report content, reports will appear here for review."
          tone="guiding"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center  bg-error/15 text-error">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-foreground capitalize">{r.target_type} report</span>
                    <StatusBadge
                      status={r.status}
                      variant={r.status === 'pending' ? 'warning' : r.status === 'resolved' ? 'success' : r.status === 'dismissed' ? 'neutral' : 'neutral'}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{r.reason}</p>
                  {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                  <p className="mt-2 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                    Reported by {r.reporter?.username ?? 'Unknown'} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedReport(r); setResolutionNotes(r.resolution_notes ?? ''); }}>
                  <Eye className="h-4 w-4" /> Review
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedReport && (
        <Modal open={true} onClose={() => setSelectedReport(null)} title="Review Report" maxWidth="max-w-lg">
          <div className="space-y-4">
            <div>
              <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Target</p>
              <p className="mt-1 text-sm font-medium text-foreground capitalize">{selectedReport.target_type} — {selectedReport.target_id}</p>
            </div>
            <div>
              <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Reason</p>
              <p className="mt-1 text-sm text-foreground">{selectedReport.reason}</p>
            </div>
            {selectedReport.description && (
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="mt-1 text-sm text-foreground">{selectedReport.description}</p>
              </div>
            )}
            <Textarea
              label="Resolution Notes"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this resolution..."
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => handleResolve('dismissed')}><X className="h-4 w-4" /> Dismiss</Button>
              <Button variant="outline" size="sm" onClick={() => handleResolve('archived')}><Archive className="h-4 w-4" /> Archive</Button>
              <Button size="sm" onClick={() => handleResolve('resolved')}><Check className="h-4 w-4" /> Resolve</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
