import { useState, useEffect } from 'react';
import { Mail, Trash2, X, Filter } from 'lucide-react';
import { fetchContactEnquiries } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import type { ContactEnquiry } from '@/types/database';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const TYPE_LABELS: Record<string, string> = {
  general: 'General Enquiries',
  support: 'Support',
  partnership: 'Business Partnerships',
  media: 'Media',
};

const STATUS_VARIANT: Record<string, 'info' | 'neutral' | 'success'> = {
  new: 'info',
  read: 'neutral',
  resolved: 'success',
};

export function AdminEnquiries() {
  const [items, setItems] = useState<ContactEnquiry[]>([]);
  const [selected, setSelected] = useState<ContactEnquiry | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<ContactEnquiry | null>(null);

  useEffect(() => { load(); }, []);
  async function load() { setItems(await fetchContactEnquiries()); }

  const filtered = filterType === 'all' ? items : items.filter((i) => i.enquiry_type === filterType);

  async function markRead(item: ContactEnquiry) {
    await supabase.from('contact_enquiries').update({ status: 'read' }).eq('id', item.id);
    load();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await supabase.from('contact_enquiries').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setSelected(null);
    load();
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Contact Enquiries"
        description="Submissions from the public contact form."
        actions={
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-field sm:w-48">
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-7 w-7" />}
          title="No enquiries found"
          description="Contact form submissions will appear here."
        />
      ) : (
        <Table
          data={filtered}
          rowKey={(e) => e.id}
          onRowClick={(e) => { setSelected(e); if (e.status === 'new') markRead(e); }}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (e) => <span className="text-sm font-medium text-foreground">{e.name}</span>,
            },
            {
              key: 'email',
              header: 'Email',
              render: (e) => <span className="font-mono text-2xs text-muted-foreground">{e.email}</span>,
            },
            {
              key: 'type',
              header: 'Type',
              render: (e) => <span className="text-xs text-muted-foreground">{TYPE_LABELS[e.enquiry_type] || e.enquiry_type}</span>,
            },
            {
              key: 'subject',
              header: 'Subject',
              render: (e) => <span className="text-sm text-foreground">{e.subject}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (e) => <StatusBadge status={e.status} variant={STATUS_VARIANT[e.status] ?? 'neutral'} />,
            },
            {
              key: 'date',
              header: 'Date',
              render: (e) => <span className="font-mono text-2xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>,
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'text-right',
              render: (e) => (
                <div onClick={(ev) => ev.stopPropagation()}>
                  <button onClick={() => setDeleteTarget(e)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Detail Modal */}
      {selected && (
        <Modal open={true} onClose={() => setSelected(null)} title="Enquiry Details" maxWidth="max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center  bg-secondary text-secondary-foreground">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                <p className="font-mono text-2xs text-muted-foreground">{selected.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Type</p>
                <p className="text-sm text-foreground">{TYPE_LABELS[selected.enquiry_type] || selected.enquiry_type}</p>
              </div>
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Subject</p>
                <p className="text-sm text-foreground">{selected.subject}</p>
              </div>
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Message</p>
                <div className=" rounded-xl border border-border bg-background p-3 text-sm text-foreground">{selected.message}</div>
              </div>
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Received</p>
                <p className="text-sm text-foreground">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <a href={`mailto:${selected.email}`}>
                <Button size="sm">Reply</Button>
              </a>
              <Button size="sm" variant="danger" onClick={() => setDeleteTarget(selected)}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Enquiry"
        message={`Delete enquiry from ${deleteTarget?.name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
