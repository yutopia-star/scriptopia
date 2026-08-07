import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Search, LayoutGrid, Table as TableIcon, SlidersHorizontal,
  TrendingUp, Users, CheckCircle, Award, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchDiscoverableScreenplays, DEFAULT_FILTERS, type DiscoveryFilters } from '@/lib/discovery';
import { computeMatch } from '@/lib/industry';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { FORMAT_LABELS } from '@/components/app/ScreenplayStatus';
import { GENRE_OPTIONS, BUDGET_RANGES } from '@/lib/constants';
import type { Screenplay, ScreenplayDiscoveryMetrics } from '@/types/database';
import { formatPercentage, confidenceVariant } from '@/lib/engagement';

export function DiscoverPage() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<Array<{ screenplay: Screenplay; metrics: ScreenplayDiscoveryMetrics | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [matchPercentages, setMatchPercentages] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchDiscoverableScreenplays(filters);
    setResults(data);
    if (profile) {
      const matches: Record<string, number> = {};
      for (const r of data.slice(0, 20)) {
        const m = await computeMatch(profile.id, r.screenplay.id);
        if (m) matches[r.screenplay.id] = m.percentage;
      }
      setMatchPercentages(matches);
    }
    setLoading(false);
  }, [filters, profile]);

  useEffect(() => { load(); }, [load]);

  function toggleArrayFilter(key: keyof DiscoveryFilters, value: string) {
    setFilters((prev) => {
      const arr = prev[key] as string[];
      const newArr = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: newArr };
    });
  }

  return (
    <div>
      <PageHeader
        label="Discover"
        title="Discover Screenplays"
        description="Screenplays discovered through measurable reader engagement — not ratings."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            <div className="flex  border border-border">
              <button onClick={() => setViewMode('grid')} className={`rounded-l-lg p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('table')} className={`rounded-r-lg p-2 ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-hover'}`}>
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by title, logline, or genre..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="input-field pl-10"
        />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader title="Filters" icon={<SlidersHorizontal className="h-5 w-5" />} action={<Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset</Button>} />
          <div className="space-y-5 p-5 pt-0 mt-4">
            {/* Sort */}
            <div>
              <SectionLabel className="mb-2">Sort By</SectionLabel>
              <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as DiscoveryFilters['sortBy'] })} className="input-field sm:w-64">
                <option value="trending">Trending</option>
                <option value="recently_validated">Recently Validated</option>
                <option value="recently_updated">Recently Updated</option>
                <option value="reader_count">Most Readers</option>
                <option value="completion">Highest Completion</option>
                <option value="recommendation">Most Recommended</option>
                <option value="retention">Best Retention</option>
                <option value="hidden_gems">Hidden Gems</option>
              </select>
            </div>

            {/* Genre */}
            <div>
              <SectionLabel className="mb-2">Genres</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleArrayFilter('genres', g)}
                    className={` border px-3 py-1 text-xs transition-colors ${filters.genres.includes(g) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <SectionLabel className="mb-2">Formats</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => toggleArrayFilter('formats', value)}
                    className={` border px-3 py-1 text-xs transition-colors ${filters.formats.includes(value) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <SectionLabel className="mb-2">Budget Range</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map((b) => (
                  <button
                    key={b}
                    onClick={() => toggleArrayFilter('budgets', b)}
                    className={` border px-3 py-1 text-xs transition-colors ${filters.budgets.includes(b) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence */}
            <div>
              <SectionLabel className="mb-2">Confidence Level</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {['high', 'medium', 'low'].map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleArrayFilter('confidenceLevels', c)}
                    className={` border px-3 py-1 text-xs capitalize transition-colors ${filters.confidenceLevels.includes(c) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Numeric filters */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <SectionLabel className="mb-2">Min Readers</SectionLabel>
                <input type="number" min="0" value={filters.minReaders ?? ''} onChange={(e) => setFilters({ ...filters, minReaders: e.target.value ? Number(e.target.value) : null })} className="input-field" placeholder="Any" />
              </div>
              <div>
                <SectionLabel className="mb-2">Min Retention %</SectionLabel>
                <input type="number" min="0" max="100" value={filters.minRetention ?? ''} onChange={(e) => setFilters({ ...filters, minRetention: e.target.value ? Number(e.target.value) : null })} className="input-field" placeholder="Any" />
              </div>
              <div>
                <SectionLabel className="mb-2">Min Completion %</SectionLabel>
                <input type="number" min="0" max="100" value={filters.minCompletion ?? ''} onChange={(e) => setFilters({ ...filters, minCompletion: e.target.value ? Number(e.target.value) : null })} className="input-field" placeholder="Any" />
              </div>
              <div>
                <SectionLabel className="mb-2">Min Recommendation %</SectionLabel>
                <input type="number" min="0" max="100" value={filters.minRecommendation ?? ''} onChange={(e) => setFilters({ ...filters, minRecommendation: e.target.value ? Number(e.target.value) : null })} className="input-field" placeholder="Any" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin  border-2 border-primary border-t-transparent" /></div>
        ) : results.length === 0 ? (
          <EmptyState icon={<Compass className="h-7 w-7" />} title="No screenplays found" description="Try adjusting your filters to discover more screenplays." tone="encouraging" action={<Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset Filters</Button>} />
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ screenplay, metrics }) => (
              <Link key={screenplay.id} to={`/app/discover/${screenplay.id}`}>
                <Card className="h-full transition-all hover:border-accent/30 hover:shadow-elevated">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-display text-base font-semibold text-foreground">{screenplay.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{screenplay.logline}</p>
                      </div>
                      {matchPercentages[screenplay.id] !== undefined && (
                        <div className="ml-2 shrink-0  bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          {matchPercentages[screenplay.id]}%
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center  rounded-lg border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{FORMAT_LABELS[screenplay.format]}</span>
                      <span className="inline-flex items-center  rounded-lg border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{screenplay.genre}</span>
                      {screenplay.page_count && <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{screenplay.page_count} pages</span>}
                    </div>
                    {metrics && (
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className=" bg-background p-2.5">
                          <Users className="mx-auto h-4 w-4 text-muted-foreground" />
                          <p className="mt-1 font-display text-lg font-semibold text-foreground">{metrics.reader_count}</p>
                          <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Readers</p>
                        </div>
                        <div className=" bg-background p-2.5">
                          <CheckCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                          <p className="mt-1 font-display text-lg font-semibold text-foreground">{formatPercentage(metrics.completion_rate)}</p>
                          <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Completion</p>
                        </div>
                        <div className=" bg-background p-2.5">
                          <Award className="mx-auto h-4 w-4 text-muted-foreground" />
                          <div className="mt-1 flex justify-center">
                            <StatusBadge status={metrics.confidence_level} variant={confidenceVariant(metrics.confidence_level)} />
                          </div>
                          <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-muted-foreground">Confidence</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-5 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">Title</th>
                    <th className="px-5 py-3 text-left font-mono text-2xs uppercase tracking-wider text-muted-foreground">Genre</th>
                    <th className="px-5 py-3 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Readers</th>
                    <th className="px-5 py-3 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Completion</th>
                    <th className="px-5 py-3 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Retention</th>
                    <th className="px-5 py-3 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Recommendation</th>
                    <th className="px-5 py-3 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Confidence</th>
                    <th className="px-5 py-3 text-center font-mono text-2xs uppercase tracking-wider text-muted-foreground">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ screenplay, metrics }) => (
                    <tr key={screenplay.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-5 py-3.5">
                        <Link to={`/app/discover/${screenplay.id}`} className="text-sm font-medium text-foreground hover:text-primary">{screenplay.title}</Link>
                        <p className="text-xs text-muted-foreground line-clamp-1">{screenplay.logline}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{screenplay.genre}</td>
                      <td className="px-5 py-3.5 text-center text-sm text-foreground">{metrics?.reader_count ?? 0}</td>
                      <td className="px-5 py-3.5 text-center text-sm text-foreground">{formatPercentage(metrics?.completion_rate ?? 0)}</td>
                      <td className="px-5 py-3.5 text-center text-sm text-foreground">{formatPercentage(metrics?.retention_page15 ?? 0)}</td>
                      <td className="px-5 py-3.5 text-center text-sm text-foreground">{formatPercentage(metrics?.recommendation_rate ?? 0)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={metrics?.confidence_level ?? 'low'} variant={confidenceVariant(metrics?.confidence_level ?? 'low')} />
                      </td>
                      <td className="px-5 py-3.5 text-center text-sm font-semibold text-primary">{matchPercentages[screenplay.id] !== undefined ? `${matchPercentages[screenplay.id]}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
