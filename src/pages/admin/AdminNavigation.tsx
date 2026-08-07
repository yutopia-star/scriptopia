import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2, Eye, EyeOff, Link2, Menu } from 'lucide-react';
import { fetchNavigation } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

type NavRow = {
  id: string;
  label: string;
  location: 'header' | 'footer';
  page_id: string | null;
  external_url: string | null;
  page_slug: string | null;
  sort_order: number;
  is_visible: boolean;
};

export function AdminNavigation() {
  const [headerNav, setHeaderNav] = useState<NavRow[]>([]);
  const [footerNav, setFooterNav] = useState<NavRow[]>([]);
  const [pages, setPages] = useState<Array<{ id: string; slug: string; title: string }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addLocation, setAddLocation] = useState<'header' | 'footer'>('header');
  const [addLabel, setAddLabel] = useState('');
  const [linkTarget, setLinkTarget] = useState<NavRow | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [header, footer] = await Promise.all([fetchNavigation('header'), fetchNavigation('footer')]);
    setHeaderNav(header as NavRow[]);
    setFooterNav(footer as NavRow[]);
    const { data } = await supabase.from('pages').select('id, slug, title').order('title');
    setPages((data ?? []) as Array<{ id: string; slug: string; title: string }>);
  }

  async function moveItem(item: NavRow, dir: -1 | 1, list: NavRow[], setList: (v: NavRow[]) => void) {
    const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const temp = sorted[idx].sort_order;
    sorted[idx].sort_order = sorted[newIdx].sort_order;
    sorted[newIdx].sort_order = temp;
    setList(sorted);
    await supabase.from('navigation').update({ sort_order: sorted[idx].sort_order }).eq('id', sorted[idx].id);
    await supabase.from('navigation').update({ sort_order: sorted[newIdx].sort_order }).eq('id', sorted[newIdx].id);
  }

  async function toggleVisible(item: NavRow) {
    await supabase.from('navigation').update({ is_visible: !item.is_visible }).eq('id', item.id);
    load();
  }

  async function deleteItem(item: NavRow) {
    if (!confirm(`Delete "${item.label}" from navigation?`)) return;
    await supabase.from('navigation').delete().eq('id', item.id);
    load();
  }

  async function addItem(location: 'header' | 'footer') {
    if (!addLabel) return;
    const list = location === 'header' ? headerNav : footerNav;
    const maxOrder = Math.max(...list.map((i) => i.sort_order), 0);
    await supabase.from('navigation').insert({ label: addLabel, location, sort_order: maxOrder + 1, is_visible: true });
    setAddLabel('');
    setShowAdd(false);
    load();
  }

  async function linkToPage(pageId: string) {
    if (!linkTarget) return;
    await supabase.from('navigation').update({ page_id: pageId, external_url: null }).eq('id', linkTarget.id);
    setLinkTarget(null);
    load();
  }

  function openAdd(location: 'header' | 'footer') {
    setAddLocation(location);
    setAddLabel('');
    setShowAdd(true);
  }

  function renderList(title: string, list: NavRow[], setList: (v: NavRow[]) => void, location: 'header' | 'footer') {
    const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order);
    return (
      <Card>
        <CardHeader
          title={title}
          subtitle={`${sorted.length} link${sorted.length !== 1 ? 's' : ''}`}
          icon={<Menu className="h-5 w-5" />}
          action={
            <Button size="sm" variant="outline" onClick={() => openAdd(location)}>
              <Plus className="h-4 w-4" /> Add Link
            </Button>
          }
        />
        <div className="mt-4 space-y-2 p-5 pt-0">
          {sorted.map((item) => (
            <div key={item.id} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3">
              <div className="flex flex-col">
                <button onClick={() => moveItem(item, -1, list, setList)} disabled={sorted[0].id === item.id} className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => moveItem(item, 1, list, setList)} disabled={sorted[sorted.length - 1].id === item.id} className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="font-mono text-2xs text-muted-foreground">
                  {item.external_url || (item.page_slug ? `/${item.page_slug}` : 'Not linked')}
                </p>
              </div>
              <button onClick={() => setLinkTarget(item)} className="inline-flex h-7 items-center gap-1.5  border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground">
                <Link2 className="h-3.5 w-3.5" /> Link
              </button>
              <button onClick={() => toggleVisible(item)} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover">
                {item.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => deleteItem(item)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {sorted.length === 0 && (
            <EmptyState
              icon={<Menu className="h-6 w-6" />}
              title={`No ${title.toLowerCase()} items`}
              description="Add navigation links to get started."
            />
          )}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Navigation"
        description="Manage header and footer navigation links. Reorder with the arrows."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {renderList('Header Navigation', headerNav, setHeaderNav, 'header')}
        {renderList('Footer Navigation', footerNav, setFooterNav, 'footer')}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Add ${addLocation === 'header' ? 'Header' : 'Footer'} Link`} maxWidth="max-w-md">
        <div className="space-y-4">
          <Input
            label="Navigation Label"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="e.g. About Us"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addItem(addLocation)} disabled={!addLabel}>Add Link</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!linkTarget} onClose={() => setLinkTarget(null)} title={`Link "${linkTarget?.label ?? ''}" to Page`} maxWidth="max-w-md">
        <div className="space-y-2">
          {pages.map((p) => (
            <button
              key={p.id}
              onClick={() => linkToPage(p.id)}
              className="flex w-full items-center gap-3  rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-accent/40 hover:bg-surface-hover"
            >
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{p.title}</p>
                <p className="font-mono text-2xs text-muted-foreground">/{p.slug}</p>
              </div>
            </button>
          ))}
          {pages.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No pages available to link.</p>}
        </div>
      </Modal>
    </div>
  );
}
