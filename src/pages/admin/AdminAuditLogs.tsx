import { useState, useEffect } from 'react';
import { ScrollText, Filter } from 'lucide-react';
import { fetchAuditLogs, type AuditLog } from '@/lib/admin';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';

const CATEGORIES = ['login', 'settings', 'theme', 'role_change', 'moderation', 'content', 'feature_flag', 'configuration', 'user_management', 'screenplay_management', 'backup', 'security'];

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  useEffect(() => { load(); }, [category]);

  async function load() {
    setLoading(true);
    const l = await fetchAuditLogs(100, category || undefined);
    setLogs(l);
    setLoading(false);
  }

  return (
    <div>
      <PageHeader
        label="Settings"
        title="Audit Logs"
        description="Immutable record of all administrator actions. These logs cannot be edited or deleted."
        actions={
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field sm:w-48">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
        }
      />

      <Card>
        <CardHeader title="Activity Log" subtitle="Most recent 100 entries" icon={<ScrollText className="h-5 w-5" />} />
        <div className="mt-4 p-5 pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 " />)}
            </div>
          ) : (
            <Table
              data={logs}
              rowKey={(log) => log.id}
              columns={[
                {
                  key: 'time',
                  header: 'Time',
                  render: (log) => <span className="font-mono text-2xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>,
                },
                {
                  key: 'admin',
                  header: 'Admin',
                  render: (log) => <span className="text-sm font-medium text-foreground">{log.admin?.username ?? '—'}</span>,
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (log) => <span className="text-sm text-foreground">{log.action}</span>,
                },
                {
                  key: 'category',
                  header: 'Category',
                  render: (log) => <StatusBadge status={log.category.replace('_', ' ')} variant="info" />,
                },
                {
                  key: 'target',
                  header: 'Target',
                  render: (log) => <span className="font-mono text-2xs text-muted-foreground">{log.target_type ? `${log.target_type}: ${log.target_id}` : '—'}</span>,
                },
              ]}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
