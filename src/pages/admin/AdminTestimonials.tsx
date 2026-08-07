import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, X, Star, Quote } from 'lucide-react';
import { fetchAllTestimonials } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { Testimonial } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems(await fetchAllTestimonials()); }

  async function toggleVisible(item: Testimonial) {
    await supabase.from('testimonials').update({ is_visible: !item.is_visible }).eq('id', item.id);
    load();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await supabase.from('testimonials').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Testimonials"
        description="Manage reader testimonials shown on the homepage."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add Testimonial
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Quote className="h-7 w-7" />}
          title="No testimonials yet"
          description="Add reader testimonials to showcase on the homepage."
          tone="guiding"
          action={
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add Testimonial
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleVisible(t)}>
                      <StatusBadge status={t.is_visible ? 'Visible' : 'Hidden'} variant={t.is_visible ? 'success' : 'neutral'} />
                    </button>
                    <button onClick={() => { setEditing(t); setShowForm(true); }} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(t)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground line-clamp-3">"{t.quote}"</p>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-sm font-medium text-foreground">{t.author_name}</p>
                  <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                    {t.author_role}{t.author_company ? `, ${t.author_company}` : ''}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <TestimonialForm item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Testimonial"
        message={`Delete testimonial from ${deleteTarget?.author_name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function TestimonialForm({ item, onClose, onSaved }: { item: Testimonial | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    author_name: item?.author_name || '',
    author_role: item?.author_role || '',
    author_company: item?.author_company || '',
    quote: item?.quote || '',
    rating: item?.rating || 5,
    is_visible: item?.is_visible ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (item) {
      await supabase.from('testimonials').update(form).eq('id', item.id);
    } else {
      await supabase.from('testimonials').insert({ ...form, sort_order: Date.now() });
    }
    onSaved();
  }

  return (
    <Modal open={true} onClose={onClose} title={`${item ? 'Edit' : 'Add'} Testimonial`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Author Name" required placeholder="e.g. Jane Doe" value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
        <Input label="Role" placeholder="e.g. Screenwriter" value={form.author_role} onChange={(e) => setForm({ ...form, author_role: e.target.value })} />
        <Input label="Company" placeholder="e.g. Independent" value={form.author_company} onChange={(e) => setForm({ ...form, author_company: e.target.value })} />
        <Textarea label="Quote" required placeholder="What they said..." value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={3} />
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Rating:</label>
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value, 10) })} className="input-field w-24">
            {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
          </select>
          <div className="flex items-center gap-1">
            {Array.from({ length: form.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
          </div>
        </div>
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
