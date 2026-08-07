import { useState, useEffect } from 'react';
import { Search, Users as UsersIcon, Shield, Ban, RotateCcw, Trash2, KeyRound, Mail, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllUsers, suspendUser, restoreUser, softDeleteUser, permanentlyDeleteUser, updateUserRoles, verifyUserEmail, resetUserPassword, logAction } from '@/lib/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';

interface AdminUser {
  id: string; username: string; email: string; created_at: string; last_active_at: string | null;
  is_deleted: boolean; is_suspended: boolean;
  roles: Array<{ role: string; is_active: boolean; verification_status: string }>;
}

const ALL_ROLES = ['writer', 'reader', 'industry', 'admin'];

export function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const u = await fetchAllUsers({ search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined });
    setUsers(u as AdminUser[]);
    setLoading(false);
  }

  async function handleSuspend(id: string) {
    await suspendUser(id);
    if (profile) await logAction(profile.id, `Suspended user ${id}`, 'user_management', { userId: id });
    await load();
  }

  async function handleRestore(id: string) {
    await restoreUser(id);
    if (profile) await logAction(profile.id, `Restored user ${id}`, 'user_management', { userId: id });
    await load();
  }

  async function handleSoftDelete(id: string) {
    await softDeleteUser(id);
    if (profile) await logAction(profile.id, `Soft-deleted user ${id}`, 'user_management', { userId: id });
    setDeleteTarget(null);
    await load();
  }

  async function handlePermanentDelete(id: string) {
    await permanentlyDeleteUser(id);
    if (profile) await logAction(profile.id, `Permanently deleted user ${id}`, 'user_management', { userId: id });
    setDeleteTarget(null);
    await load();
  }

  async function handleVerifyEmail(id: string) {
    await verifyUserEmail(id);
    if (profile) await logAction(profile.id, `Verified email for user ${id}`, 'user_management', { userId: id });
    await load();
  }

  async function handleResetPassword(id: string) {
    await resetUserPassword(id);
    if (profile) await logAction(profile.id, `Reset password for user ${id}`, 'user_management', { userId: id });
  }

  async function handleRoleChange(userId: string, roles: string[]) {
    await updateUserRoles(userId, roles);
    if (profile) await logAction(profile.id, `Changed roles for user ${userId}`, 'role_change', { userId, roles });
    setRoleModalUser(null);
    await load();
  }

  const columns = [
    {
      key: 'username',
      header: 'Username',
      render: (u: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center  bg-secondary text-xs font-semibold text-secondary-foreground">
            {u.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-foreground">{u.username}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (u: AdminUser) => <span className="text-muted-foreground">{u.email}</span>,
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (u: AdminUser) => (
        <div className="flex flex-wrap gap-1">
          {u.roles?.map((r, i) => (
            <span key={i} className={`font-mono text-2xs uppercase tracking-wider  px-2 py-0.5 ${r.role === 'admin' ? 'bg-error/10 text-error' : r.role === 'industry' ? 'bg-accent/10 text-accent' : 'bg-secondary text-secondary-foreground'}`}>
              {r.role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: AdminUser) =>
        u.is_deleted ? <StatusBadge status="Deleted" variant="error" /> : u.is_suspended ? <StatusBadge status="Suspended" variant="warning" /> : <StatusBadge status="Active" variant="success" />,
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (u: AdminUser) => <span className="font-mono text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u: AdminUser) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setSelectedUser(u)} className=" p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="View"><Eye className="h-4 w-4" /></button>
          <button onClick={() => setRoleModalUser(u)} className=" p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Change Roles"><Shield className="h-4 w-4" /></button>
          {!u.is_suspended ? (
            <button onClick={() => handleSuspend(u.id)} className=" p-2 text-warning transition-colors hover:bg-warning/10" title="Suspend"><Ban className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => handleRestore(u.id)} className=" p-2 text-success transition-colors hover:bg-success/10" title="Restore"><RotateCcw className="h-4 w-4" /></button>
          )}
          <button onClick={() => handleVerifyEmail(u.id)} className=" p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Verify Email"><Mail className="h-4 w-4" /></button>
          <button onClick={() => handleResetPassword(u.id)} className=" p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground" title="Reset Password"><KeyRound className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(u)} className=" p-2 text-error transition-colors hover:bg-error/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        label="Admin"
        title="Users"
        description="Manage all platform users, roles, and access control."
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field sm:w-40">
            <option value="">All Roles</option>
            <option value="writer">Writers</option>
            <option value="reader">Readers</option>
            <option value="industry">Industry</option>
            <option value="admin">Admins</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field sm:w-40">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
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
      ) : users.length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="No users found"
          description="Try adjusting your search or filters to find what you're looking for."
        />
      ) : (
        <Table
          columns={columns}
          data={users}
          rowKey={(u) => u.id}
        />
      )}

      {/* User detail modal */}
      {selectedUser && (
        <Modal open={true} onClose={() => setSelectedUser(null)} title="User Details" maxWidth="max-w-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center  bg-secondary text-lg font-semibold text-secondary-foreground">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">{selectedUser.username}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Joined</p>
                <p className="mt-1 text-sm font-medium text-foreground">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Last Active</p>
                <p className="mt-1 text-sm font-medium text-foreground">{selectedUser.last_active_at ? new Date(selectedUser.last_active_at).toLocaleDateString() : 'Never'}</p>
              </div>
            </div>
            <div>
              <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Roles</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedUser.roles?.map((r, i) => (
                  <span key={i} className=" bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{r.role} ({r.verification_status})</span>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Role change modal */}
      {roleModalUser && (
        <RoleChangeModal user={roleModalUser} onClose={() => setRoleModalUser(null)} onSave={(roles) => handleRoleChange(roleModalUser.id, roles)} />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete User"
        message={`Soft-delete "${deleteTarget?.username}"? The user will be suspended and marked as deleted. They can be restored later or permanently deleted.`}
        confirmLabel="Soft Delete"
        onConfirm={() => deleteTarget && handleSoftDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function RoleChangeModal({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: (roles: string[]) => void }) {
  const [roles, setRoles] = useState<string[]>(user.roles?.map((r) => r.role) ?? []);

  function toggleRole(role: string) {
    setRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  }

  return (
    <Modal open={true} onClose={onClose} title={`Change Roles — ${user.username}`} maxWidth="max-w-md">
      <div className="space-y-3">
        {ALL_ROLES.map((role) => (
          <label key={role} className="flex items-center gap-3  rounded-xl border border-border bg-background p-3.5 transition-colors hover:bg-surface-hover cursor-pointer">
            <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} className="h-4 w-4 rounded border-input" />
            <span className="text-sm font-medium text-foreground capitalize">{role}</span>
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(roles)}>Save Roles</Button>
        </div>
      </div>
    </Modal>
  );
}
