import { supabase } from '@/lib/supabase';
import type {
  EngagementReport, EngagementReportData, CommentTheme, AISummary,
  RevisionComparison, ScreenplayDiscoveryMetrics, ConfidenceLevel,
} from '@/types/database';

export async function fetchEngagementReport(screenplayId: string): Promise<EngagementReport | null> {
  const { data } = await supabase
    .from('engagement_reports')
    .select('*')
    .eq('screenplay_id', screenplayId)
    .order('computed_at', { ascending: false })
    .maybeSingle();
  return data as EngagementReport | null;
}

export async function fetchEngagementReportByVersion(versionId: string): Promise<EngagementReport | null> {
  const { data } = await supabase
    .from('engagement_reports')
    .select('*')
    .eq('screenplay_version_id', versionId)
    .maybeSingle();
  return data as EngagementReport | null;
}

export async function refreshEngagementReport(screenplayId: string): Promise<EngagementReportData | null> {
  const { data, error } = await supabase.rpc('update_discovery_metrics', { p_screenplay_id: screenplayId });
  if (error) return null;
  const report = await fetchEngagementReport(screenplayId);
  return (report?.report_data as EngagementReportData) ?? null;
}

export function parseReportData(report: EngagementReport | null): EngagementReportData | null {
  if (!report?.report_data) return null;
  return report.report_data as EngagementReportData;
}

export async function fetchCommentThemes(versionId: string): Promise<CommentTheme[]> {
  const { data } = await supabase
    .from('comment_themes')
    .select('*')
    .eq('screenplay_version_id', versionId)
    .order('comment_count', { ascending: false });
  return (data ?? []) as CommentTheme[];
}

export async function fetchAISummaries(versionId: string): Promise<AISummary[]> {
  const { data } = await supabase
    .from('ai_summaries')
    .select('*')
    .eq('screenplay_version_id', versionId)
    .order('computed_at', { ascending: false });
  return (data ?? []) as AISummary[];
}

export async function fetchReaderFeedback(screenplayId: string): Promise<Array<{
  id: string;
  feedback: string;
  decision: string;
  recommendation: boolean | null;
  created_at: string;
  page_abandoned: number | null;
  stop_reason: string | null;
}>> {
  const { data } = await supabase
    .from('reader_decisions')
    .select(`
      id,
      written_feedback,
      decision,
      recommendation,
      created_at,
      page_abandoned,
      stop_reason,
      assignment:reader_assignments!inner(screenplay_id)
    `)
    .eq('assignment.screenplay_id', screenplayId)
    .not('written_feedback', 'is', null)
    .order('created_at', { ascending: false });
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    feedback: r.written_feedback as string,
    decision: r.decision as string,
    recommendation: r.recommendation as boolean | null,
    created_at: r.created_at as string,
    page_abandoned: r.page_abandoned as number | null,
    stop_reason: r.stop_reason as string | null,
  }));
}

export async function fetchRevisionComparison(versionAId: string, versionBId: string): Promise<RevisionComparison | null> {
  const { data } = await supabase
    .from('revision_comparisons')
    .select('*')
    .or(`and(version_a_id.eq.${versionAId},version_b_id.eq.${versionBId}),and(version_a_id.eq.${versionBId},version_b_id.eq.${versionAId})`)
    .maybeSingle();
  return data as RevisionComparison | null;
}

export async function fetchDiscoveryMetrics(screenplayId: string): Promise<ScreenplayDiscoveryMetrics | null> {
  const { data } = await supabase
    .from('screenplay_discovery_metrics')
    .select('*')
    .eq('screenplay_id', screenplayId)
    .maybeSingle();
  return data as ScreenplayDiscoveryMetrics | null;
}

export async function fetchDiscoveryConfig(): Promise<{
  min_readers: number;
  min_completed_reviews: number;
  min_confidence_level: ConfidenceLevel;
  auto_validate_enabled: boolean;
} | null> {
  const { data } = await supabase
    .from('platform_discovery_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  return data as ReturnType<typeof fetchDiscoveryConfig> extends Promise<infer T> ? T : never;
}

export function formatReadingTime(ms: number): string {
  if (!ms || ms === 0) return '—';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${minutes}m`;
}

export function formatPercentage(value: number): string {
  if (value === 0 || isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
}

export function confidenceVariant(level: ConfidenceLevel): 'error' | 'warning' | 'success' {
  if (level === 'high') return 'success';
  if (level === 'medium') return 'warning';
  return 'error';
}

export const RETENTION_MILESTONES = [
  { key: 'page3' as const, label: 'Page 3', page: 3 },
  { key: 'page10' as const, label: 'Page 10', page: 10 },
  { key: 'page15' as const, label: 'Page 15', page: 15 },
  { key: 'page45' as const, label: 'Page 45', page: 45 },
  { key: 'final' as const, label: 'Final Completion', page: 0 },
];

export const COMMENT_THEME_LABELS: Record<string, string> = {
  opening: 'Opening',
  dialogue: 'Dialogue',
  characters: 'Characters',
  pacing: 'Pacing',
  structure: 'Structure',
  formatting: 'Formatting',
  ending: 'Ending',
  general: 'General',
};

export const AI_SUMMARY_LABELS: Record<string, string> = {
  overall: 'Overall Summary',
  themes: 'Recurring Themes',
  pacing: 'Pacing Issues',
  dialogue: 'Dialogue Concerns',
  exposition: 'Exposition-Heavy Sections',
  formatting: 'Formatting Issues',
  genre_consistency: 'Genre Consistency',
  revision_suggestions: 'Revision Suggestions',
};
