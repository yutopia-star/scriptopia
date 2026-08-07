import { supabase } from '@/lib/supabase';
import type {
  ReaderAssignment, ReadingSession, ReaderDecisionRecord,
  ReaderBehaviour, RetentionMilestone, ReviewReason,
  ReaderContributionBalance, ContributionEvent, ReaderContributionAlgorithm,
} from '@/types/database';

// ---- Assignment ----
export interface AssignmentResult {
  assignment_id: string | null;
  screenplay_id?: string;
  screenplay_version_id?: string;
  title?: string;
  logline?: string;
  genre?: string;
  format?: string;
  page_count?: number | null;
  language?: string;
  estimated_budget?: string | null;
  assigned_at?: string;
  current_page?: number;
  reading_progress?: number;
  status?: string;
  message?: string;
}

export async function getOrCreateAssignment(readerId: string): Promise<AssignmentResult | null> {
  const { data, error } = await supabase.rpc('assign_screenplay_to_reader', { p_reader_id: readerId });
  if (error) throw new Error(error.message);
  return data as AssignmentResult | null;
}

export async function fetchActiveAssignment(readerId: string): Promise<ReaderAssignment | null> {
  const { data } = await supabase
    .from('reader_assignments')
    .select('*')
    .eq('reader_id', readerId)
    .eq('status', 'active')
    .maybeSingle();
  return data as ReaderAssignment | null;
}

export async function fetchAssignmentScreenplay(assignment: ReaderAssignment) {
  const { data } = await supabase
    .from('screenplays')
    .select('title, logline, genre, format, page_count, language, estimated_budget')
    .eq('id', assignment.screenplay_id)
    .maybeSingle();
  return data;
}

export async function fetchAssignmentVersion(assignment: ReaderAssignment) {
  if (!assignment.screenplay_version_id) return null;
  const { data } = await supabase
    .from('screenplay_versions')
    .select('file_path, page_count')
    .eq('id', assignment.screenplay_version_id)
    .maybeSingle();
  return data;
}

export async function updateAssignmentProgress(
  assignmentId: string,
  currentPage: number,
  readingProgress: number,
  totalReadingTimeMs: number,
): Promise<void> {
  await supabase
    .from('reader_assignments')
    .update({
      current_page: currentPage,
      reading_progress: readingProgress,
      total_reading_time_ms: totalReadingTimeMs,
    })
    .eq('id', assignmentId);
}

export async function markAssignmentReturnedLater(assignmentId: string): Promise<void> {
  await supabase
    .from('reader_assignments')
    .update({ returned_later: true })
    .eq('id', assignmentId);
}

// ---- Reading Sessions ----
export async function createReadingSession(
  assignmentId: string,
  readerId: string,
  startPage: number,
): Promise<ReadingSession | null> {
  const { data, error } = await supabase
    .from('reading_sessions')
    .insert({
      assignment_id: assignmentId,
      reader_id: readerId,
      start_page: startPage,
      end_page: startPage,
      device_type: getDeviceType(),
    })
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ReadingSession | null;
}

export async function updateReadingSession(
  sessionId: string,
  updates: Partial<ReadingSession>,
): Promise<void> {
  await supabase.from('reading_sessions').update(updates).eq('id', sessionId);
}

export async function fetchSessions(assignmentId: string): Promise<ReadingSession[]> {
  const { data } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false });
  return (data ?? []) as ReadingSession[];
}

// ---- Retention Milestones ----
const MILESTONE_PAGES = [3, 10, 15, 45];
const MILESTONE_NAMES: Record<number, string> = {
  3: 'Page 3',
  10: 'Page 10',
  15: 'Page 15',
  45: 'Page 45',
};

export async function recordMilestone(
  assignmentId: string,
  readerId: string,
  page: number,
  readingTimeMs: number,
): Promise<void> {
  for (const mp of MILESTONE_PAGES) {
    if (page >= mp) {
      await supabase
        .from('retention_milestones')
        .upsert({
          assignment_id: assignmentId,
          reader_id: readerId,
          milestone_page: mp,
          milestone_name: MILESTONE_NAMES[mp],
          reading_time_ms: readingTimeMs,
        }, { onConflict: 'assignment_id,milestone_page' });
    }
  }
}

export async function recordFinalMilestone(
  assignmentId: string,
  readerId: string,
  finalPage: number,
  readingTimeMs: number,
): Promise<void> {
  await supabase
    .from('retention_milestones')
    .upsert({
      assignment_id: assignmentId,
      reader_id: readerId,
      milestone_page: finalPage,
      milestone_name: 'Final Page',
      reading_time_ms: readingTimeMs,
    }, { onConflict: 'assignment_id,milestone_page' });
}

export async function fetchMilestones(assignmentId: string): Promise<RetentionMilestone[]> {
  const { data } = await supabase
    .from('retention_milestones')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('milestone_page', { ascending: true });
  return (data ?? []) as RetentionMilestone[];
}

// ---- Review Reasons ----
export async function fetchReviewReasons(): Promise<ReviewReason[]> {
  const { data } = await supabase
    .from('review_reasons')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data ?? []) as ReviewReason[];
}

// ---- Complete Assignment ----
export async function analyzeFeedbackQuality(
  feedback: string,
  pagesRead: number,
  decision: string,
): Promise<number> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return 0;

    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-feedback-quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ feedback, pagesRead, decision }),
    });
    if (!response.ok) return 0;
    const data = await response.json();
    if (!data || typeof data.score !== 'number') return 0;
    return data.score;
  } catch {
    return 0;
  }
}

export async function completeAssignment(params: {
  assignmentId: string;
  decision: 'finished' | 'stopped' | 'return_later';
  finished: boolean;
  recommendation: string | null;
  feedback: string;
  notes?: string;
  stopReason?: string;
  pageAbandoned?: number | null;
  readingTimeMs: number;
  sessionCount: number;
}): Promise<void> {
  let qualityScore = 0;
  if (params.feedback && params.decision !== 'return_later') {
    const pagesRead = params.decision === 'finished'
      ? (params.pageAbandoned ?? 0)
      : (params.pageAbandoned ?? 0);
    qualityScore = await analyzeFeedbackQuality(params.feedback, pagesRead, params.decision);
  }

  const { error } = await supabase.rpc('complete_reader_assignment', {
    p_assignment_id: params.assignmentId,
    p_decision: params.decision,
    p_finished: params.finished,
    p_recommendation: params.recommendation,
    p_feedback: params.feedback,
    p_notes: params.notes || null,
    p_stop_reason: params.stopReason || null,
    p_page_abandoned: params.pageAbandoned ?? null,
    p_reading_time_ms: params.readingTimeMs,
    p_session_count: params.sessionCount,
    p_feedback_quality_score: Math.round(qualityScore),
  });
  if (error) throw new Error(error.message);
}

// ---- Contribution Balances ----
export async function fetchContributionBalance(readerId: string): Promise<ReaderContributionBalance | null> {
  const { data } = await supabase
    .from('reader_contribution_balances')
    .select('*')
    .eq('reader_id', readerId)
    .maybeSingle();
  return data as ReaderContributionBalance | null;
}

export async function fetchContributionEvents(readerId: string): Promise<ContributionEvent[]> {
  const { data } = await supabase
    .from('contribution_events')
    .select('*')
    .eq('reader_id', readerId)
    .order('created_at', { ascending: false });
  return (data ?? []) as ContributionEvent[];
}

export async function fetchActiveAlgorithm(): Promise<ReaderContributionAlgorithm | null> {
  const { data } = await supabase
    .from('reader_contribution_algorithm')
    .select('*')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as ReaderContributionAlgorithm | null;
}

// ---- Review History ----
export interface ReviewHistoryItem {
  assignment: ReaderAssignment;
  decision: ReaderDecisionRecord | null;
  screenplay: { title: string; genre: string; format: string } | null;
}

export async function fetchReviewHistory(readerId: string): Promise<ReviewHistoryItem[]> {
  const { data: assignments } = await supabase
    .from('reader_assignments')
    .select('*')
    .eq('reader_id', readerId)
    .in('status', ['completed', 'abandoned'])
    .order('assigned_at', { ascending: false });

  if (!assignments || assignments.length === 0) return [];

  const results: ReviewHistoryItem[] = [];
  for (const ra of assignments as ReaderAssignment[]) {
    const { data: sp } = await supabase
      .from('screenplays')
      .select('title, genre, format')
      .eq('id', ra.screenplay_id)
      .maybeSingle();
    const { data: dec } = await supabase
      .from('reader_decisions')
      .select('*')
      .eq('assignment_id', ra.id)
      .maybeSingle();
    results.push({
      assignment: ra,
      decision: dec as ReaderDecisionRecord | null,
      screenplay: sp as { title: string; genre: string; format: string } | null,
    });
  }
  return results;
}

// ---- Reader Behaviour ----
export async function fetchReaderBehaviour(readerId: string): Promise<ReaderBehaviour | null> {
  const { data } = await supabase
    .from('reader_behaviour')
    .select('*')
    .eq('reader_id', readerId)
    .maybeSingle();
  if (!data) {
    await supabase.from('reader_behaviour').insert({ reader_id: readerId });
    const { data: newData } = await supabase
      .from('reader_behaviour')
      .select('*')
      .eq('reader_id', readerId)
      .maybeSingle();
    return newData as ReaderBehaviour | null;
  }
  return data as ReaderBehaviour;
}

// ---- File Access ----
export async function getSignedFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('screenplays')
    .createSignedUrl(filePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

// ---- Helpers ----
function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/.test(ua)) return 'mobile';
  if (/Tablet/.test(ua)) return 'tablet';
  return 'web';
}

export function formatReadingTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatReadingTimeShort(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}
