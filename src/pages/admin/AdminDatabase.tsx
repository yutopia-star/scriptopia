import { useState, useEffect } from 'react';
import { Database, HardDrive, Table } from 'lucide-react';
import { fetchAnalyticsData } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';

export function AdminDatabase() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnalyticsData>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData(365).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;

  const totalRows = data.tableCounts.reduce((sum, t) => sum + Number(t.row_count), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Database</h1>
      <p className="mt-1 text-sm text-muted-foreground">Database statistics and storage information. No direct database editing.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className=" rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><Table className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground">Tables</span></div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{data.tableCounts.length}</p>
        </div>
        <div className=" rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><Database className="h-5 w-5 text-accent" /><span className="text-sm text-muted-foreground">Total Rows</span></div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalRows.toLocaleString()}</p>
        </div>
        <div className=" rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-success" /><span className="text-sm text-muted-foreground">Storage</span></div>
          <p className="mt-2 text-2xl font-semibold text-foreground">—</p>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Table Statistics" subtitle="Row counts for all public tables" icon={<Table className="h-5 w-5" />} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">Table Name</th>
                <th className="px-4 py-2 text-right font-mono text-2xs uppercase tracking-wider text-muted-foreground">Row Count</th>
              </tr>
            </thead>
            <tbody>
              {data.tableCounts.map((t) => (
                <tr key={t.table_name} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-2.5 text-sm font-mono text-foreground">{t.table_name}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-muted-foreground">{Number(t.row_count).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Growth Trends" subtitle="Recent activity" icon={<HardDrive className="h-5 w-5" />} />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className=" rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">New Users (30d)</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{data.userGrowth.reduce((s, d) => s + d.count, 0)}</p>
          </div>
          <div className=" rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">New Uploads (30d)</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{data.uploads.reduce((s, d) => s + d.count, 0)}</p>
          </div>
          <div className=" rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Reviews Completed (30d)</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{data.reviews.reduce((s, d) => s + d.count, 0)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
