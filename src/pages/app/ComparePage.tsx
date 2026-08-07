import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { GitCompare, FileText, X, Download, Users, CheckCircle, TrendingUp, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchDiscoveryMetrics } from '@/lib/engagement';
import { computeMatch } from '@/lib/industry';
import { recordExport } from '@/lib/discovery';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import type { Screenplay, ScreenplayDiscoveryMetrics } from '@/types/database';
import { formatPercentage, confidenceVariant } from '@/lib/engagement';

interface CompareItem {
  screenplay: Screenplay;
  metrics: ScreenplayDiscoveryMetrics | null;
  matchPct: number | null;
}

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, [searchParams, profile]);

  async function load() {
    setLoading(true);
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
    const result: CompareItem[] = [];

    for (const id of ids) {
      const { data: sp } = await supabase.from('screenplays').select('*').eq('id', id).maybeSingle();
      if (sp) {
        const metrics = await fetchDiscoveryMetrics(id);
        let matchPct: number | null = null;
        if (profile) {
          const m = await computeMatch(profile.id, id);
          matchPct = m?.percentage ?? null;
        }
        result.push({ screenplay: sp as Screenplay, metrics, matchPct });
      }
    }
    setItems(result);
    setLoading(false);
  }

  async function handleExport() {
    if (!profile) return;
    await recordExport(profile.id, 'comparison_report');
    window.print();
  }

  function removeItem(id: string) {
    const newIds = items.filter((i) => i.screenplay.id !== id).map((i) => i.screenplay.id);
    const url = newIds.length > 0 ? `/app/compare?ids=${newIds.join(',')}` : '/app/discover';
    window.location.href = url;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader
        label="Compare"
        title="Compare Screenplays"
        description="Side-by-side comparison of engagement metrics and producer match."
        backTo="/app/discover"
        backLabel="Back to Discover"
        actions={items.length > 0 ? <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4" /> Export PDF</Button> : undefined}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<GitCompare className="h-7 w-7" />}
          title="No screenplays to compare"
          description="Add screenplays from the Discover page to compare them side by side."
          tone="encouraging"
          action={<Link to="/app/discover"><Button><FileText className="h-4 w-4" /> Browse Discover</Button></Link>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">Metric</th>
                  {items.map((item) => (
                    <th key={item.screenplay.id} className="px-5 py-3 text-left">
                      <div className="flex items-center justify-between">
                        <Link to={`/app/discover/${item.screenplay.id}`} className="text-sm font-semibold text-foreground transition-colors hover:text-primary">{item.screenplay.title}</Link>
                        <button onClick={() => removeItem(item.screenplay.id)} className="ml-2  p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-error"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">{FORMAT_LABELS[item.screenplay.format]} · {item.screenplay.genre}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Logline" values={items.map((i) => i.screenplay.logline || '—')} />
                <CompareRow label="Page Count" values={items.map((i) => i.screenplay.page_count ? `${i.screenplay.page_count}` : '—')} />
                <CompareRow label="Country" values={items.map((i) => i.screenplay.country)} />
                <CompareRow label="Language" values={items.map((i) => i.screenplay.language)} />
                <CompareRow label="Budget" values={items.map((i) => i.screenplay.estimated_budget || '—')} />
                <CompareRow label="Readers" values={items.map((i) => `${i.metrics?.reader_count ?? 0}`)} icon={Users} />
                <CompareRow label="Completion Rate" values={items.map((i) => formatPercentage(i.metrics?.completion_rate ?? 0))} icon={CheckCircle} />
                <CompareRow label="Retention (Page 15)" values={items.map((i) => formatPercentage(i.metrics?.retention_page15 ?? 0))} icon={TrendingUp} />
                <CompareRow label="Recommendation Rate" values={items.map((i) => formatPercentage(i.metrics?.recommendation_rate ?? 0))} icon={TrendingUp} />
                <CompareRow label="Confidence" values={items.map((i) => i.metrics?.confidence_level ?? 'low')} icon={Award} />
                <CompareRow label="Producer Match" values={items.map((i) => i.matchPct !== null ? `${i.matchPct}%` : '—')} icon={Award} />
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CompareRow({ label, values, icon: Icon }: { label: string; values: string[]; icon?: typeof Users }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-5 py-3.5 text-sm text-muted-foreground">{v}</td>
      ))}
    </tr>
  );
}
