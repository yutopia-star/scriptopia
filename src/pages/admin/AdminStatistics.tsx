import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, X, BarChart3, Eye, EyeOff } from 'lucide-react';
import { fetchAllStats } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { SiteStat } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AdminStatistics() {
  const [items, setItems] = useState<SiteStat[]>([]);
  const [editing, setEditing] = useState<SiteStat | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SiteStat | null>(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems(await fetchAllStats()); }

  async function deleteItem() {
    if (!deleteTarget) return;
    await supabase.from('site_statistics').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  async function toggleVisible(item: SiteStat) {
    await supabase.from('site_statistics').update({ is_visible: !item.is_visible }).eq('id', item.id);
    load();
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Statistics"
        description="Animated counters shown on the homepage stats section."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add Statistic
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No statistics yet"
          description="Add statistics to display animated counters on the homepage."
          tone="guiding"
          action={
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add Statistic
            </Button>
          }
        />
      ) : (
        <Table
          data={items}
          rowKey={(s) => s.id}
          columns={[
            {
              key: 'label',
              header: 'Label',
              render: (s) => <span className="text-sm font-medium text-foreground">{s.label}</span>,
            },
            {
              key: 'value',
              header: 'Value',
              render: (s) => <span className="font-mono text-sm text-muted-foreground">{s.value.toLocaleString()}</span>,
            },
            {
              key: 'suffix',
              header: 'Suffix',
              render: (s) => <span className="font-mono text-2xs text-muted-foreground">{s.suffix || '—'}</span>,
            },
            {
              key: 'icon',
              header: 'Icon',
              render: (s) => <span className="font-mono text-2xs text-muted-foreground">{s.icon || '—'}</span>,
            },
            {
              key: 'visible',
              header: 'Visibility',
              render: (s) => (
                <button onClick={() => toggleVisible(s)} className="inline-flex items-center gap-1.5">
                  {s.is_visible ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  <StatusBadge status={s.is_visible ? 'Visible' : 'Hidden'} variant={s.is_visible ? 'success' : 'neutral'} />
                </button>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'text-right',
              render: (s) => (
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => { setEditing(s); setShowForm(true); }} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(s)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ),
            },
          ]}
        />
      )}

      {showForm && (
        <StatForm item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Statistic"
        message={`Delete "${deleteTarget?.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function StatForm({ item, onClose, onSaved }: { item: SiteStat | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    label: item?.label || '',
    value: item?.value ?? 0,
    suffix: item?.suffix || '',
    icon: item?.icon || 'FileText',
    is_visible: item?.is_visible ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (item) {
      await supabase.from('site_statistics').update(form).eq('id', item.id);
    } else {
      await supabase.from('site_statistics').insert({ ...form, sort_order: Date.now() });
    }
    onSaved();
  }

  return (
    <Modal open={true} onClose={onClose} title={`${item ? 'Edit' : 'Add'} Statistic`} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Label" required placeholder="e.g. Screenplays Uploaded" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <Input label="Value" type="number" required placeholder="0" value={form.value} onChange={(e) => setForm({ ...form, value: parseInt(e.target.value, 10) || 0 })} />
        <Input label="Suffix" placeholder="e.g. +" value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} />
        <Input label="Icon Name" placeholder="e.g. FileText, Users" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} hint="Lucide icon name" />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="h-4 w-4 rounded border-input" />
          Visible on homepage
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
