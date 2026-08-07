import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Star, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { fetchAllFaqEntries } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { FaqEntry } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AdminFaq() {
  const [items, setItems] = useState<FaqEntry[]>([]);
  const [editing, setEditing] = useState<FaqEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqEntry | null>(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems(await fetchAllFaqEntries()); }

  async function deleteItem() {
    if (!deleteTarget) return;
    await supabase.from('faq_entries').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  async function toggleVisible(item: FaqEntry) {
    await supabase.from('faq_entries').update({ is_visible: !item.is_visible }).eq('id', item.id);
    load();
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="FAQ Entries"
        description="Questions and answers shown on the FAQ page and homepage."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add FAQ
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="h-7 w-7" />}
          title="No FAQ entries yet"
          description="Add questions and answers to help users find information."
          tone="guiding"
          action={
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add FAQ
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{f.question}</p>
                      {f.category && (
                        <span className=" bg-secondary px-2.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-secondary-foreground">
                          {f.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{f.answer}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleVisible(f)} className="inline-flex items-center gap-1">
                      {f.is_visible ? <Eye className="h-3.5 w-3.5 text-success" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      <StatusBadge status={f.is_visible ? 'Visible' : 'Hidden'} variant={f.is_visible ? 'success' : 'neutral'} />
                    </button>
                    <button onClick={() => { setEditing(f); setShowForm(true); }} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(f)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <FaqForm item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete FAQ Entry"
        message="Delete this FAQ entry? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FaqForm({ item, onClose, onSaved }: { item: FaqEntry | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    question: item?.question || '',
    answer: item?.answer || '',
    category: item?.category || 'General',
    is_visible: item?.is_visible ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (item) {
      await supabase.from('faq_entries').update(form).eq('id', item.id);
    } else {
      await supabase.from('faq_entries').insert({ ...form, sort_order: Date.now() });
    }
    onSaved();
  }

  return (
    <Modal open={true} onClose={onClose} title={`${item ? 'Edit' : 'Add'} FAQ Entry`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Question" required placeholder="e.g. How does it work?" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
        <Textarea label="Answer" required placeholder="The answer shown to users" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={5} />
        <Input label="Category" placeholder="e.g. General, Writers, Industry" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="h-4 w-4 rounded border-input" />
          Visible on site
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
