import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Plus, Trash2, FileText, Eye, Clock, Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchWatchlists, createWatchlist, deleteWatchlist, fetchWatchlistItems, removeFromWatchlist } from '@/lib/industry';
import { fetchRecentlyViewed } from '@/lib/discovery';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { Watchlist, Screenplay } from '@/types/database';

export function WatchlistsPage() {
  const { profile } = useAuth();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeList, setActiveList] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<Array<{ id: string; screenplay_id: string; added_at: string; screenplay: Screenplay }>>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ screenplay_id: string; viewed_at: string; screenplay: Screenplay }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Watchlist | null>(null);

  useEffect(() => { if (profile) load(); }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    const wl = await fetchWatchlists(profile.id);
    setWatchlists(wl);
    if (wl.length > 0 && !activeList) setActiveList(wl[0]);

    const rv = await fetchRecentlyViewed(profile.id);
    if (rv.length > 0) {
      const ids = rv.map((r) => r.screenplay_id);
      const { data: sps } = await supabase.from('screenplays').select('*').in('id', ids);
      const spMap = new Map((sps ?? []).map((s: Screenplay) => [s.id, s]));
      setRecentlyViewed(rv.map((r) => ({ ...r, screenplay: spMap.get(r.screenplay_id) as Screenplay })));
    }
    setLoading(false);
  }

  async function loadItems(wl: Watchlist) {
    setActiveList(wl);
    const its = await fetchWatchlistItems(wl.id);
    setItems(its as Array<{ id: string; screenplay_id: string; added_at: string; screenplay: Screenplay }>);
  }

  async function handleCreate() {
    if (!profile || !newName) return;
    await createWatchlist(profile.id, newName);
    setNewName('');
    setShowCreate(false);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteWatchlist(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  }

  async function handleRemove(screenplayId: string) {
    if (!activeList) return;
    await removeFromWatchlist(activeList.id, screenplayId);
    await loadItems(activeList);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader
        label="Watchlists"
        title="Watchlists"
        description="Save and organise screenplays you are interested in."
        actions={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Watchlist</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Watchlist sidebar */}
        <div className="space-y-2">
          <SectionLabel className="mb-3">Your Watchlists</SectionLabel>
          {watchlists.length === 0 ? (
            <EmptyState icon={<Bookmark className="h-7 w-7" />} title="No watchlists" description="Create a watchlist to start saving screenplays." tone="encouraging" action={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Watchlist</Button>} />
          ) : (
            watchlists.map((wl) => (
              <button
                key={wl.id}
                onClick={() => loadItems(wl)}
                className={`flex w-full items-center gap-3  border p-3 text-left transition-all ${activeList?.id === wl.id ? 'border-primary bg-primary/5 ' : 'border-border hover:bg-surface-hover hover:border-accent/20'}`}
              >
                <div className={`flex h-9 w-9 items-center justify-center  ${activeList?.id === wl.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  <Bookmark className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{wl.name}</p>
                  <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{new Date(wl.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(wl); }} className=" p-1 text-muted-foreground transition-colors hover:text-error">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            ))
          )}
        </div>

        {/* Watchlist items */}
        <div className="lg:col-span-2">
          {activeList ? (
            <Card>
              <CardHeader title={activeList.name} subtitle={activeList.description || 'Saved screenplays'} icon={<Bookmark className="h-5 w-5" />} />
              <div className="mt-4 p-5 pt-0">
                {items.length === 0 ? (
                  <EmptyState icon={<FileText className="h-7 w-7" />} title="No saved screenplays" description="Browse Discover and save screenplays to this watchlist." tone="guiding" action={<Link to="/app/discover"><Button size="sm"><Compass className="h-4 w-4" /> Discover</Button></Link>} />
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3 transition-colors hover:bg-surface-hover">
                        <div className="flex h-9 w-9 items-center justify-center  bg-secondary text-secondary-foreground">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <Link to={`/app/discover/${item.screenplay_id}`} className="text-sm font-medium text-foreground hover:text-primary">{item.screenplay?.title}</Link>
                          <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                            {item.screenplay?.genre} · {FORMAT_LABELS[item.screenplay?.format ?? '']}
                            {item.screenplay?.page_count && ` · ${item.screenplay.page_count} pages`}
                          </p>
                        </div>
                        <Link to={`/app/discover/${item.screenplay_id}`} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleRemove(item.screenplay_id)} className=" p-1.5 text-muted-foreground transition-colors hover:text-error">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <EmptyState icon={<Bookmark className="h-7 w-7" />} title="Select a watchlist" description="Choose a watchlist from the left to view its saved screenplays." />
          )}
        </div>
      </div>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Recently Viewed" subtitle="Screenplays you recently looked at" icon={<Clock className="h-5 w-5" />} />
          <div className="mt-4 grid gap-3 p-5 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyViewed.slice(0, 6).map((rv) => (
              <Link key={rv.screenplay_id} to={`/app/discover/${rv.screenplay_id}`}>
                <div className=" rounded-xl border border-border bg-background p-3 transition-all hover:border-accent/20 hover:">
                  <p className="text-sm font-medium text-foreground">{rv.screenplay?.title}</p>
                  <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{rv.screenplay?.genre} · {new Date(rv.viewed_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {showCreate && (
        <Modal open={true} onClose={() => setShowCreate(false)} title="Create Watchlist" maxWidth="max-w-md">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" placeholder="e.g. Drama Shortlist" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName}>Create</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Watchlist"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All saved screenplays will be removed.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
