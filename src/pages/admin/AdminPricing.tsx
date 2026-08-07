import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, X, Star, Check } from 'lucide-react';
import { fetchAllPricingPlans } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { PricingPlan } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AdminPricing() {
  const [items, setItems] = useState<PricingPlan[]>([]);
  const [editing, setEditing] = useState<PricingPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PricingPlan | null>(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems(await fetchAllPricingPlans()); }

  async function toggleVisible(item: PricingPlan) {
    await supabase.from('pricing_plans').update({ is_visible: !item.is_visible }).eq('id', item.id);
    load();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await supabase.from('pricing_plans').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Pricing Plans"
        description="Manage pricing cards shown on the pricing page."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add Plan
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Star className="h-7 w-7" />}
          title="No pricing plans yet"
          description="Add pricing plans to display on the pricing page."
          tone="guiding"
          action={
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> Add Plan
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className={p.is_featured ? 'border-primary shadow-elevated' : ''}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">{p.name}</h3>
                      {p.is_featured && <Star className="h-4 w-4 fill-primary text-primary" />}
                    </div>
                    {p.status === 'coming_soon' && <StatusBadge status="Coming Soon" variant="warning" />}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(p); setShowForm(true); }} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(p)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="mt-3 font-display text-2xl font-semibold text-foreground">
                  {p.price_monthly === 0 ? 'Free' : `$${p.price_monthly}`}
                  {p.price_monthly !== 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
                <ul className="mt-4 space-y-2">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => toggleVisible(p)} className="mt-4">
                  <StatusBadge status={p.is_visible ? 'Visible' : 'Hidden'} variant={p.is_visible ? 'success' : 'neutral'} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <PlanForm item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Plan"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PlanForm({ item, onClose, onSaved }: { item: PricingPlan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price_monthly: item?.price_monthly ?? 0,
    price_yearly: item?.price_yearly ?? 0,
    features: (item?.features || []).join('\n'),
    cta_label: item?.cta_label || 'Get Started',
    cta_url: item?.cta_url || '/create-account',
    is_featured: item?.is_featured ?? false,
    status: item?.status || 'active',
    is_visible: item?.is_visible ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      price_monthly: parseFloat(String(form.price_monthly)) || 0,
      price_yearly: parseFloat(String(form.price_yearly)) || 0,
      features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    if (item) {
      await supabase.from('pricing_plans').update(payload).eq('id', item.id);
    } else {
      await supabase.from('pricing_plans').insert({ ...payload, sort_order: Date.now() });
    }
    onSaved();
  }

  return (
    <Modal open={true} onClose={onClose} title={`${item ? 'Edit' : 'Add'} Plan`} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Plan Name" required placeholder="e.g. Pro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Textarea label="Description" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Monthly Price" type="number" step="0.01" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: parseFloat(e.target.value) || 0 })} />
          <Input label="Yearly Price" type="number" step="0.01" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: parseFloat(e.target.value) || 0 })} />
        </div>
        <Textarea label="Features (one per line)" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={5} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CTA Label" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
          <Input label="CTA URL" value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
            <option value="active">Active</option>
            <option value="coming_soon">Coming Soon</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="h-4 w-4 rounded border-input" />
          Featured plan
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="h-4 w-4 rounded border-input" />
          Visible on pricing page
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
