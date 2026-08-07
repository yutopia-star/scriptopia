import { useState, useEffect } from 'react';
import { Search, FileText, EyeOff, Archive, RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllScreenplaysForAdmin, hideScreenplay, restoreScreenplay, archiveScreenplay, softDeleteScreenplay, resetReviewCycle, logAction } from '@/lib/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { GENRE_OPTIONS } from '@/lib/constants';

interface AdminScreenplay {
  id: string; title: string; logline: string; genre: string; format: string; status: string;
  country: string; language: string; is_deleted: boolean; created_at: string; updated_at: string;
  writer: { username: string };
}

export function AdminScreenplays() {
  const { profile } = useAuth();
  const [screenplays, setScreenplays] = useState<AdminScreenplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminScreenplay | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const s = await fetchAllScreenplaysForAdmin({ search: search || undefined, status: statusFilter || undefined, genre: genreFilter || undefined });
    setScreenplays(s as AdminScreenplay[]);
    setLoading(false);
  }

  async function handleAction(id: string, action: string, fn: (id: string) => Promise<void>) {
    await fn(id);
    if (profile) await logAction(profile.id, `${action} screenplay ${id}`, 'screenplay_management', { screenplayId: id });
    await load();
  }

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (sp: AdminScreenplay) => (
        <div>
          <p className="font-medium text-foreground">{sp.title}</p>
          {sp.is_deleted && <span className="text-xs text-error"> (deleted)</span>}
        </div>
      ),
    },
    {
      key: 'writer',
      header: 'Writer',
      render: (sp: AdminScreenplay) => <span className="text-muted-foreground">{sp.writer?.username ?? '—'}</span>,
    },
    {
      key: 'genre',
      header: 'Genre',
      render: (sp: AdminScreenplay) => <span className="font-mono text-xs text-muted-foreground">{sp.genre}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (sp: AdminScreenplay) => (
        <StatusBadge
          status={sp.status}
          variant={sp.status === 'validated' || sp.status === 'producer_visible' ? 'success' : sp.status === 'hidden' || sp.status === 'archived' ? 'warning' : 'neutral'}
        />
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      render: (sp: AdminScreenplay) => <span className="font-mono text-xs text-muted-foreground">{new Date(sp.updated_at).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (sp: AdminScreenplay) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => handleAction(sp.id, 'Hid', hideScreenplay)} className=" p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Hide"><EyeOff className="h-4 w-4" /></button>
          <button onClick={() => handleAction(sp.id, 'Restored', restoreScreenplay)} className=" p-2 text-success transition-colors hover:bg-success/10" title="Restore"><RotateCcw className="h-4 w-4" /></button>
          <button onClick={() => handleAction(sp.id, 'Archived', archiveScreenplay)} className=" p-2 text-warning transition-colors hover:bg-warning/10" title="Archive"><Archive className="h-4 w-4" /></button>
          <button onClick={() => handleAction(sp.id, 'Reset review cycle for', resetReviewCycle)} className=" p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Reset Review Cycle"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(sp)} className=" p-2 text-error transition-colors hover:bg-error/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        label="Admin"
        title="Screenplays"
        description="Manage all screenplays on the platform."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search screenplays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field sm:w-40">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="validated">Validated</option>
            <option value="producer_visible">Producer Visible</option>
            <option value="hidden">Hidden</option>
            <option value="archived">Archived</option>
          </select>
          <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="input-field sm:w-40">
            <option value="">All Genres</option>
            {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={load}>Filter</Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 " />
          ))}
        </div>
      ) : screenplays.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No screenplays found"
          description="Try adjusting your search or filters to find what you're looking for."
        />
      ) : (
        <Table
          columns={columns}
          data={screenplays}
          rowKey={(sp) => sp.id}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Screenplay"
        message={`Soft-delete "${deleteTarget?.title}"? The screenplay will be archived and marked as deleted. It can be restored or permanently deleted later.`}
        confirmLabel="Soft Delete"
        onConfirm={async () => { if (deleteTarget) { await softDeleteScreenplay(deleteTarget.id); if (profile) await logAction(profile.id, `Soft-deleted screenplay ${deleteTarget.id}`, 'screenplay_management', { screenplayId: deleteTarget.id }); setDeleteTarget(null); await load(); } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
