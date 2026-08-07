import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, FileText, Eye, Download } from 'lucide-react';
import { fetchAnalyticsData } from '@/lib/admin';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function AdminAnalytics() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnalyticsData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalyticsData(days).then((d) => { setData(d); setLoading(false); });
  }, [days]);

  if (loading || !data) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;

  const totalUsers = data.userGrowth.reduce((sum, d) => sum + d.count, 0);
  const totalUploads = data.uploads.reduce((sum, d) => sum + d.count, 0);
  const totalReviews = data.reviews.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Platform-wide analytics and growth metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="input-field sm:w-40">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className=" rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground">New Users</span></div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalUsers}</p>
        </div>
        <div className=" rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /><span className="text-sm text-muted-foreground">New Uploads</span></div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalUploads}</p>
        </div>
        <div className=" rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2"><Eye className="h-5 w-5 text-success" /><span className="text-sm text-muted-foreground">Reviews Completed</span></div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{totalReviews}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="User Growth" subtitle={`New registrations in the last ${days} days`} data={data.userGrowth} color="#2563eb" />
        <ChartCard title="Screenplay Uploads" subtitle={`New uploads in the last ${days} days`} data={data.uploads} color="#0ea5e9" />
        <ChartCard title="Reviews Completed" subtitle={`Completed reviews in the last ${days} days`} data={data.reviews} color="#22c55e" />
      </div>

      {/* Table counts */}
      <Card className="mt-6">
        <CardHeader title="Database Records" subtitle="Row counts per table" icon={<BarChart3 className="h-5 w-5" />} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">Table</th>
                <th className="px-4 py-2 text-right font-mono text-2xs uppercase tracking-wider text-muted-foreground">Rows</th>
              </tr>
            </thead>
            <tbody>
              {data.tableCounts.map((t) => (
                <tr key={t.table_name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-sm font-mono text-foreground">{t.table_name}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-muted-foreground">{t.row_count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ChartCard({ title, subtitle, data, color }: { title: string; subtitle: string; data: Array<{ date: string; count: number }>; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={<TrendingUp className="h-5 w-5" />} />
      <div className="mt-4">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {data.slice(-30).map((d) => (
              <div key={d.date} className="flex-1 transition-all" style={{ height: `${(d.count / max) * 100}%`, minHeight: '2px' }}>
                <div className="h-full w-full rounded-t" style={{ backgroundColor: color }} title={`${d.date}: ${d.count}`} />
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{data[0]?.date ?? ''}</span>
          <span>{data[data.length - 1]?.date ?? ''}</span>
        </div>
      </div>
    </Card>
  );
}
