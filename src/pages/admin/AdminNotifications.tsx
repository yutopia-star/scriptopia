import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Edit, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, logAction, type AdminAnnouncement } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const ANNOUNCEMENT_TYPES = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'alert', label: 'System Alert' },
  { value: 'notification', label: 'Notification' },
];

const AUDIENCES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'writers', label: 'Writers' },
  { value: 'readers', label: 'Readers' },
  { value: 'industry', label: 'Industry' },
  { value: 'admins', label: 'Administrators' },
];

export function AdminNotifications() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setAnnouncements(await fetchAnnouncements());
    setLoading(false);
  }

  async function handleSave(data: Omit<AdminAnnouncement, 'id' | 'created_by' | 'created_at' | 'updated_at'>) {
    if (!profile) return;
    if (editing) {
      await updateAnnouncement(editing.id, data);
      await logAction(profile.id, `Updated announcement "${data.title}"`, 'content', { announcementId: editing.id });
    } else {
      await createAnnouncement(data, profile.id);
      await logAction(profile.id, `Created announcement "${data.title}"`, 'content', { title: data.title });
    }
    setShowEditor(false);
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget || !profile) return;
    await deleteAnnouncement(deleteTarget.id);
    await logAction(profile.id, `Deleted announcement "${deleteTarget.title}"`, 'content', { announcementId: deleteTarget.id });
    setDeleteTarget(null);
    await load();
  }

  async function handleToggleActive(ann: AdminAnnouncement) {
    await updateAnnouncement(ann.id, { is_active: !ann.is_active });
    await load();
  }

  return (
    <div>
      <PageHeader
        label="Content"
        title="Notifications"
        description="Create announcements, maintenance messages, and system alerts."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setShowEditor(true); }}>
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 " />)}
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title="No announcements yet"
          description="Create announcements to notify users of updates, maintenance, or alerts."
          tone="guiding"
          action={
            <Button size="sm" onClick={() => { setEditing(null); setShowEditor(true); }}>
              <Plus className="h-4 w-4" /> New Announcement
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <Card key={ann.id}>
              <div className="flex items-start gap-4 p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center  ${ann.type === 'maintenance' ? 'bg-warning/15 text-warning' : ann.type === 'alert' ? 'bg-error/15 text-error' : 'bg-primary/15 text-primary'}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                    <StatusBadge status={ann.type} variant={ann.type === 'maintenance' ? 'warning' : ann.type === 'alert' ? 'error' : 'neutral'} />
                    <StatusBadge status={ann.is_active ? 'Active' : 'Inactive'} variant={ann.is_active ? 'success' : 'neutral'} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{ann.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {ann.audience}</span>
                    {ann.scheduled_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(ann.scheduled_at).toLocaleDateString()}</span>}
                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggleActive(ann)} className={`inline-flex h-7 items-center  px-2.5 text-xs font-medium transition-colors ${ann.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {ann.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => { setEditing(ann); setShowEditor(true); }} className=" p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTarget(ann)} className=" p-1.5 text-error transition-colors hover:bg-error/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showEditor && (
        <AnnouncementEditor announcement={editing} onClose={() => { setShowEditor(false); setEditing(null); }} onSave={handleSave} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Announcement"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AnnouncementEditor({ announcement, onClose, onSave }: { announcement: AdminAnnouncement | null; onClose: () => void; onSave: (data: Omit<AdminAnnouncement, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => void }) {
  const [form, setForm] = useState({
    title: announcement?.title ?? '',
    message: announcement?.message ?? '',
    type: announcement?.type ?? 'announcement',
    audience: announcement?.audience ?? 'everyone',
    is_active: announcement?.is_active ?? true,
    is_dismissible: announcement?.is_dismissible ?? true,
    scheduled_at: announcement?.scheduled_at ?? '',
    expires_at: announcement?.expires_at ?? '',
  });

  return (
    <Modal open={true} onClose={onClose} title={announcement ? 'Edit Announcement' : 'New Announcement'} maxWidth="max-w-lg">
      <div className="space-y-4">
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Textarea
          label="Message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
              {ANNOUNCEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Audience</label>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="input-field">
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Schedule At</label>
            <input type="datetime-local" value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ''} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Expires At</label>
            <input type="datetime-local" value={form.expires_at ? form.expires_at.slice(0, 16) : ''} onChange={(e) => setForm({ ...form, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} className="input-field" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-input" /> Active</label>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.is_dismissible} onChange={(e) => setForm({ ...form, is_dismissible: e.target.checked })} className="h-4 w-4 rounded border-input" /> Dismissible</label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title || !form.message}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
