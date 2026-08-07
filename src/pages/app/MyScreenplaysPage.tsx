import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Search, LayoutGrid, Table as TableIcon, Upload, Archive, Trash2, Eye, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchScreenplays, softDeleteScreenplay, archiveScreenplay } from '@/lib/writer';
import { ScreenplayStatusBadge, FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { GENRE_OPTIONS } from '@/lib/constants';
import type { Screenplay } from '@/types/database';

type SortKey = 'title' | 'status' | 'updated_at' | 'created_at' | 'draft_number';
type ViewMode = 'grid' | 'table';

export function MyScreenplaysPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [screenplays, setScreenplays] = useState<Screenplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Screenplay | null>(null);

  useEffect(() => {
    if (profile) load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setScreenplays(await fetchScreenplays(profile.id));
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let result = screenplays;
    if (search) result = result.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.logline?.toLowerCase().includes(search.toLowerCase()));
    if (filterFormat !== 'all') result = result.filter((s) => s.format === filterFormat);
    if (filterGenre !== 'all') result = result.filter((s) => s.genre === filterGenre);
    if (filterStatus !== 'all') result = result.filter((s) => s.status === filterStatus);
    if (filterLanguage !== 'all') result = result.filter((s) => s.language === filterLanguage);
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortKey === 'updated_at') cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      else if (sortKey === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortKey === 'draft_number') cmp = a.draft_number - b.draft_number;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [screenplays, search, sortKey, sortDir, filterFormat, filterGenre, filterStatus, filterLanguage]);

  async function handleDelete() {
    if (!deleteTarget || !profile) return;
    await softDeleteScreenplay(deleteTarget.id, profile.id);
    setDeleteTarget(null);
    load();
  }

  async function handleArchive(sp: Screenplay) {
    if (!profile) return;
    await archiveScreenplay(sp.id, profile.id);
    load();
  }

  const languages = useMemo(() => {
    const set = new Set(screenplays.map((s) => s.language));
    return Array.from(set);
  }, [screenplays]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader
        label="Library"
        title="My Screenplays"
        description={`${screenplays.length} screenplay${screenplays.length !== 1 ? 's' : ''} in your library`}
        actions={
          <Link to="/app/screenplays/upload">
            <Button size="sm"><Upload className="h-4 w-4" /> Upload Screenplay</Button>
          </Link>
        }
      />

      {screenplays.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No screenplays uploaded yet"
          description="Upload your first screenplay to begin receiving reader engagement."
          action={<Link to="/app/screenplays/upload"><Button><Upload className="h-4 w-4" /> Upload Your First Screenplay</Button></Link>}
          tone="encouraging"
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search screenplays..."
                className="input-field pl-10"
              />
            </div>
            <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} className="input-field w-auto">
              <option value="all">All Formats</option>
              <option value="feature">Feature Film</option>
              <option value="tv_pilot">Television Pilot</option>
              <option value="short_film">Short Film</option>
            </select>
            <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="input-field w-auto">
              <option value="all">All Genres</option>
              {GENRE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field w-auto">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="awaiting_assignment">Awaiting Assignment</option>
              <option value="in_review">In Review</option>
              <option value="validated">Validated</option>
              <option value="producer_visible">Producer Visible</option>
              <option value="archived">Archived</option>
              <option value="hidden">Hidden</option>
            </select>
            {languages.length > 1 && (
              <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="input-field w-auto">
                <option value="all">All Languages</option>
                {languages.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
            <div className="flex  rounded-xl border border-border bg-surface p-0.5">
              <button
                onClick={() => setView('grid')}
                className={`flex h-8 w-8 items-center justify-center  transition-colors ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('table')}
                className={`flex h-8 w-8 items-center justify-center  transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-7 w-7" />}
              title="No screenplays match your filters"
              description="Try adjusting your search or filters."
              tone="guiding"
            />
          ) : view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((sp) => (
                <Link key={sp.id} to={`/app/screenplays/${sp.id}`}>
                  <Card className="group h-full">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center  bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <FileText className="h-6 w-6" />
                      </div>
                      <ScreenplayStatusBadge status={sp.status} />
                    </div>
                    <h3 className="mt-4 font-display text-base font-semibold text-foreground line-clamp-1">{sp.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{sp.logline || 'No logline'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono  bg-secondary px-2 py-0.5 text-secondary-foreground">{FORMAT_LABELS[sp.format]}</span>
                      <span className="font-mono  bg-secondary px-2 py-0.5 text-secondary-foreground">{sp.genre}</span>
                      {sp.page_count && <span className="font-mono">{sp.page_count}p</span>}
                    </div>
                    <div className="mt-3 border-t border-border pt-3 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                      Draft {sp.draft_number} · Updated {new Date(sp.updated_at).toLocaleDateString()}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Table
              data={filtered}
              rowKey={(sp) => sp.id}
              onRowClick={(sp) => navigate(`/app/screenplays/${sp.id}`)}
              columns={[
                {
                  key: 'title',
                  header: 'Title',
                  render: (sp) => (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-secondary-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{sp.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{sp.logline || 'No logline'}</p>
                      </div>
                    </div>
                  ),
                },
                { key: 'format', header: 'Format', render: (sp) => <span className="font-mono text-xs text-muted-foreground">{FORMAT_LABELS[sp.format]}</span> },
                { key: 'genre', header: 'Genre', render: (sp) => <span className="text-sm text-foreground">{sp.genre}</span> },
                {
                  key: 'status',
                  header: 'Status',
                  render: (sp) => <ScreenplayStatusBadge status={sp.status} />,
                },
                { key: 'draft_number', header: 'Draft', render: (sp) => <span className="font-mono text-xs text-muted-foreground">v{sp.draft_number}</span> },
                { key: 'page_count', header: 'Pages', render: (sp) => <span className="font-mono text-xs text-muted-foreground">{sp.page_count || '—'}</span> },
                {
                  key: 'updated_at',
                  header: 'Updated',
                  render: (sp) => <span className="text-xs text-muted-foreground">{new Date(sp.updated_at).toLocaleDateString()}</span>,
                },
                {
                  key: 'actions',
                  header: '',
                  render: (sp) => (
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/app/screenplays/${sp.id}`} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="View"><Eye className="h-4 w-4" /></Link>
                      <Link to={`/app/screenplays/${sp.id}?edit=1`} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="Edit"><Pencil className="h-4 w-4" /></Link>
                      <button onClick={() => handleArchive(sp)} className=" p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground" title="Archive"><Archive className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(sp)} className=" p-1.5 text-error hover:bg-error/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Screenplay"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This is a soft delete — the screenplay will be moved to trash and can be restored later.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
