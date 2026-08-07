import { supabase } from '@/lib/supabase';
import type { ScreenplayDiscoveryMetrics, Screenplay } from '@/types/database';

export interface DiscoveryFilters {
  genres: string[];
  formats: string[];
  budgets: string[];
  countries: string[];
  languages: string[];
  minReaders: number | null;
  minRetention: number | null;
  minCompletion: number | null;
  minRecommendation: number | null;
  confidenceLevels: string[];
  sortBy: 'trending' | 'recently_validated' | 'recently_updated' | 'reader_count' | 'completion' | 'recommendation' | 'retention' | 'hidden_gems';
  search: string;
}

export const DEFAULT_FILTERS: DiscoveryFilters = {
  genres: [],
  formats: [],
  budgets: [],
  countries: [],
  languages: [],
  minReaders: null,
  minRetention: null,
  minCompletion: null,
  minRecommendation: null,
  confidenceLevels: [],
  sortBy: 'trending',
  search: '',
};

export interface DiscoveryResult {
  screenplay: Screenplay;
  metrics: ScreenplayDiscoveryMetrics | null;
}

export async function fetchDiscoverableScreenplays(filters: DiscoveryFilters): Promise<DiscoveryResult[]> {
  let query = supabase
    .from('screenplay_discovery_metrics')
    .select(`
      *,
      screenplay:screenplays!inner(*)
    `)
    .eq('is_discoverable', true)
    .eq('screenplay.is_deleted', false);

  if (filters.genres.length > 0) {
    query = query.in('screenplay.genre', filters.genres);
  }
  if (filters.formats.length > 0) {
    query = query.in('screenplay.format', filters.formats);
  }
  if (filters.budgets.length > 0) {
    query = query.in('screenplay.estimated_budget', filters.budgets);
  }
  if (filters.countries.length > 0) {
    query = query.in('screenplay.country', filters.countries);
  }
  if (filters.languages.length > 0) {
    query = query.in('screenplay.language', filters.languages);
  }
  if (filters.minReaders !== null) {
    query = query.gte('reader_count', filters.minReaders);
  }
  if (filters.minRetention !== null) {
    query = query.gte('retention_page15', filters.minRetention);
  }
  if (filters.minCompletion !== null) {
    query = query.gte('completion_rate', filters.minCompletion);
  }
  if (filters.minRecommendation !== null) {
    query = query.gte('recommendation_rate', filters.minRecommendation);
  }
  if (filters.confidenceLevels.length > 0) {
    query = query.in('confidence_level', filters.confidenceLevels);
  }

  switch (filters.sortBy) {
    case 'trending':
      query = query.order('trending_score', { ascending: false });
      break;
    case 'recently_validated':
      query = query.order('last_review_at', { ascending: false });
      break;
    case 'recently_updated':
      query = query.order('computed_at', { ascending: false });
      break;
    case 'reader_count':
      query = query.order('reader_count', { ascending: false });
      break;
    case 'completion':
      query = query.order('completion_rate', { ascending: false });
      break;
    case 'recommendation':
      query = query.order('recommendation_rate', { ascending: false });
      break;
    case 'retention':
      query = query.order('retention_page15', { ascending: false });
      break;
    case 'hidden_gems':
      query = query.order('industry_views', { ascending: true }).order('recommendation_rate', { ascending: false });
      break;
  }

  const { data } = await query.limit(100);
  const results = (data ?? []) as Array<ScreenplayDiscoveryMetrics & { screenplay: Screenplay }>;

  let filtered = results;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = results.filter(
      (r) =>
        r.screenplay?.title?.toLowerCase().includes(q) ||
        r.screenplay?.logline?.toLowerCase().includes(q) ||
        r.screenplay?.genre?.toLowerCase().includes(q),
    );
  }

  return filtered.map((r) => ({ screenplay: r.screenplay, metrics: r as unknown as ScreenplayDiscoveryMetrics }));
}

export async function trackScreenplayView(userId: string, screenplayId: string): Promise<void> {
  await supabase
    .from('recently_viewed_screenplays')
    .upsert({ user_id: userId, screenplay_id: screenplayId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,screenplay_id' });
}

export async function fetchRecentlyViewed(userId: string): Promise<Array<{ screenplay_id: string; viewed_at: string }>> {
  const { data } = await supabase
    .from('recently_viewed_screenplays')
    .select('screenplay_id, viewed_at')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(20);
  return (data ?? []) as Array<{ screenplay_id: string; viewed_at: string }>;
}

export async function recordExport(userId: string, exportType: string, screenplayId?: string): Promise<void> {
  await supabase.from('export_history').insert({
    user_id: userId,
    export_type: exportType,
    screenplay_id: screenplayId ?? null,
    file_format: 'pdf',
  });
}
